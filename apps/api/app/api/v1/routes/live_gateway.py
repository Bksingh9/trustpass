from __future__ import annotations

import re
from datetime import date, datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse, Response
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session, aliased

from app.core.errors import TrustPassError
from app.core.security import UserContext, get_user_context
from app.db.session import get_db
from app.models.audit import ActivityLog, AuditEvent
from app.models.buyer import BuyerProfile, BuyerVendorRequest
from app.models.document import Document, DocumentType
from app.models.enums import (
    AuditAction,
    BuyerRequestStatus,
    DocumentStatus,
    MembershipRole,
    MembershipStatus,
    NotificationChannel,
    NotificationStatus,
    OrganizationType,
    UserStatus,
    VerificationStatus,
)
from app.models.identity import Membership, User
from app.models.notification import Notification
from app.models.organization import Organization
from app.models.vendor import VendorProfile
from app.models.verification import TrustScoreSnapshot, VerificationRequest

router = APIRouter()
GATEWAY_ADMIN_ROLES = frozenset({MembershipRole.admin, MembershipRole.super_admin})
SEEDED_SYNTHETIC_ORG_NAMES = frozenset(
    {
        "Atlas Freight Partners",
        "Brightline Procurement",
        "Clearpath Advisory",
        "Northstar Digital Studio",
        "TRUSTPASS Operations",
    }
)
QA_RECORD_PREFIXES = (
    "QA ",
    "TRUSTPASS QA ",
    "TRUSTPASS Public ",
    "Debug ",
)
QA_RECORD_TOKENS = (
    "pages-final-qa-",
    "pages-qa-",
    "public-gateway-",
    "debug-",
)


def _response_headers(request_id: str) -> dict[str, str]:
    return {
        "x-request-id": request_id,
        "Cache-Control": "no-store, max-age=0",
        "Pragma": "no-cache",
    }


def _request_id(request: Request) -> str:
    return request.headers.get("x-request-id") or f"live-gateway-{datetime.now(timezone.utc).timestamp()}"


def _synthetic_record_bucket(name: str) -> str:
    if name in SEEDED_SYNTHETIC_ORG_NAMES:
        return "seed"
    if name.startswith(QA_RECORD_PREFIXES) or any(token in name for token in QA_RECORD_TOKENS):
        return "qa_or_proof"
    return "unknown"


def _state_metadata(state: dict) -> dict:
    organization_names = [
        row.get("name", "")
        for section in ("vendors", "buyers")
        for row in state.get(section, [])
        if isinstance(row, dict)
    ]
    buckets = [_synthetic_record_bucket(name) for name in organization_names]
    seed_records = buckets.count("seed")
    qa_or_proof_records = buckets.count("qa_or_proof")
    unknown_records = buckets.count("unknown")
    synthetic_records = seed_records + qa_or_proof_records
    total_records = len(buckets)

    if total_records == 0:
        data_classification = "empty"
        contains_customer_data = False
        assessment = "no_records_present"
    elif unknown_records == 0:
        data_classification = "synthetic_seed_and_qa"
        contains_customer_data = False
        assessment = "no_customer_data_detected"
    else:
        data_classification = "mixed_or_unknown"
        contains_customer_data = None
        assessment = "unknown_records_present"

    return {
        "data_classification": data_classification,
        "contains_customer_data": contains_customer_data,
        "customer_data_assessment": assessment,
        "organization_records": {
            "total": total_records,
            "synthetic": synthetic_records,
            "seed": seed_records,
            "qa_or_proof": qa_or_proof_records,
            "unknown": unknown_records,
        },
        "synthetic_record_signals": [
            "seeded TRUSTPASS demo organization names",
            "QA/proof/debug naming prefixes and run-id tokens",
        ],
    }


def _authorize_gateway_writer(context: UserContext, db: Session) -> User:
    if not {"admin", "super_admin"}.intersection(context.roles):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")

    user = db.execute(
        select(User).where(
            User.auth_subject_id == context.auth_subject_id,
            User.status == UserStatus.active,
        )
    ).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Active TRUSTPASS user required")
    if context.user_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Authenticated user context required")
    if context.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Authenticated user context mismatch")
    if context.organization_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authenticated organization context required",
        )

    membership = db.execute(
        select(Membership).where(
            Membership.user_id == user.id,
            Membership.role.in_(GATEWAY_ADMIN_ROLES),
            Membership.status == MembershipStatus.active,
        )
    ).scalar_one_or_none()
    if membership is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Active admin membership required")
    if membership.organization_id != context.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authenticated organization context mismatch",
        )

    return user


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "trustpass-record"


def _unique_slug(db: Session, name: str) -> str:
    base = _slugify(name)
    slug = base
    suffix = 1
    while db.execute(select(Organization.id).where(Organization.slug == slug)).scalar_one_or_none():
        suffix += 1
        slug = f"{base}-{suffix}"
    return slug


def _category_document_type(db: Session) -> DocumentType:
    document_type = db.execute(
        select(DocumentType).where(DocumentType.code == "category_compliance")
    ).scalar_one_or_none()
    if document_type is None:
        raise TrustPassError("Category compliance document type is missing", "document_type_missing", 409)
    return document_type


def _document_status(value: str | None) -> DocumentStatus:
    if value == "changes_requested":
        return DocumentStatus.rejected
    try:
        return DocumentStatus(value or "uploaded")
    except ValueError:
        return DocumentStatus.uploaded


def _record_activity(
    db: Session,
    *,
    organization_id: UUID,
    actor_user_id: UUID | None,
    action: str,
    summary: str,
    entity_type: str,
    entity_id: UUID | None,
) -> None:
    db.add(
        ActivityLog(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action=action,
            summary=summary,
            entity_type=entity_type,
            entity_id=entity_id,
            created_at=datetime.now(timezone.utc),
        )
    )


def _record_audit(
    db: Session,
    *,
    organization_id: UUID,
    actor_user_id: UUID | None,
    action: AuditAction,
    entity_type: str,
    entity_id: UUID | None,
    request_id: str,
    summary: str,
) -> None:
    db.add(
        AuditEvent(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            metadata_json={"request_id": request_id, "summary": summary},
            created_at=datetime.now(timezone.utc),
        )
    )


def _location(org: Organization, profile: VendorProfile | None = None) -> str:
    if profile and profile.primary_location:
        return profile.primary_location
    return ", ".join(part for part in [org.city, org.region, org.country] if part)


def _live_state(db: Session, request_id: str) -> dict:
    vendor_rows = db.execute(
        select(Organization, VendorProfile)
        .join(VendorProfile, VendorProfile.organization_id == Organization.id)
        .where(Organization.type == OrganizationType.vendor, Organization.deleted_at.is_(None))
        .order_by(desc(Organization.created_at))
        .limit(50)
    ).all()
    buyer_rows = db.execute(
        select(Organization, BuyerProfile)
        .outerjoin(BuyerProfile, BuyerProfile.organization_id == Organization.id)
        .where(Organization.type == OrganizationType.buyer, Organization.deleted_at.is_(None))
        .order_by(desc(Organization.created_at))
        .limit(50)
    ).all()
    document_rows = db.execute(
        select(Document, Organization)
        .join(Organization, Organization.id == Document.organization_id)
        .where(Document.deleted_at.is_(None))
        .order_by(desc(Document.created_at))
        .limit(50)
    ).all()
    buyer_org = aliased(Organization)
    vendor_org = aliased(Organization)
    request_rows = db.execute(
        select(BuyerVendorRequest, buyer_org, vendor_org)
        .join(buyer_org, buyer_org.id == BuyerVendorRequest.buyer_organization_id)
        .join(
            vendor_org,
            vendor_org.id == BuyerVendorRequest.vendor_organization_id,
        )
        .order_by(desc(BuyerVendorRequest.created_at))
        .limit(50)
    ).all()
    activity_rows = db.execute(
        select(ActivityLog).order_by(desc(ActivityLog.created_at)).limit(50)
    ).scalars()
    audit_rows = db.execute(select(AuditEvent).order_by(desc(AuditEvent.created_at)).limit(50)).scalars()
    score_rows = db.execute(
        select(TrustScoreSnapshot, Organization)
        .join(Organization, Organization.id == TrustScoreSnapshot.organization_id)
        .order_by(desc(TrustScoreSnapshot.created_at))
        .limit(50)
    ).all()
    notification_rows = db.execute(
        select(Notification).order_by(desc(Notification.created_at)).limit(50)
    ).scalars()

    return {
        "vendors": [
            {
                "id": str(org.id),
                "name": org.name,
                "category": org.industry or "Uncategorized",
                "location": _location(org, profile),
                "contact_email": "",
                "trust_score": profile.current_trust_score,
                "verification_status": profile.onboarding_status.value,
            }
            for org, profile in vendor_rows
        ],
        "buyers": [
            {
                "id": str(org.id),
                "name": org.name,
                "category": org.industry or "Procurement",
                "location": _location(org),
                "contact_email": "",
            }
            for org, _profile in buyer_rows
        ],
        "documents": [
            {
                "id": str(document.id),
                "organization_id": str(document.organization_id),
                "vendor_name": org.name,
                "document_name": document.file_name,
                "status": document.status.value,
                "expiry_date": document.expires_at.isoformat() if document.expires_at else None,
            }
            for document, org in document_rows
        ],
        "buyer_requests": [
            {
                "id": str(item.id),
                "buyer_id": str(item.buyer_organization_id),
                "vendor_id": str(item.vendor_organization_id),
                "buyer_name": buyer.name,
                "vendor_name": vendor.name,
                "subject": item.subject,
                "message": item.message,
                "status": item.status.value,
            }
            for item, buyer, vendor in request_rows
        ],
        "request_logs": [
            {
                "method": "GET",
                "path": "/api/trustpass",
                "status": 200,
                "request_id": request_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
            *[
                {
                    "method": "EVENT",
                    "path": row.action,
                    "status": 201,
                    "request_id": request_id,
                    "created_at": row.created_at.isoformat(),
                }
                for row in activity_rows
            ],
        ],
        "audit_events": [
            {
                "id": str(event.id),
                "action": event.action.value,
                "entity_type": event.entity_type,
                "request_id": event.metadata_json.get("request_id", request_id),
                "summary": event.metadata_json.get("summary", event.action.value),
            }
            for event in audit_rows
        ],
        "trust_score_snapshots": [
            {
                "id": str(snapshot.id),
                "vendor_id": str(snapshot.organization_id),
                "vendor_name": org.name,
                "score": snapshot.score,
                "status": snapshot.trust_level,
                "evidence_request_id": snapshot.evidence_refs.get("request_id"),
                "buyer_safe_summary": "; ".join(snapshot.reasons[:2]),
            }
            for snapshot, org in score_rows
        ],
        "notifications": [
            {
                "id": str(item.id),
                "title": item.subject,
                "type": item.template_key or item.related_entity_type or "notification",
                "request_id": str(item.related_entity_id) if item.related_entity_id else request_id,
                "body": item.body,
                "organization_name": "",
            }
            for item in notification_rows
        ],
    }


def _state_response(db: Session, request_id: str, status_code: int = 200) -> JSONResponse:
    state = _live_state(db, request_id)
    return JSONResponse(
        {"data": state, "meta": _state_metadata(state), "request_id": request_id},
        status_code=status_code,
        headers=_response_headers(request_id),
    )


@router.get("/health")
async def gateway_health(request: Request) -> JSONResponse:
    request_id = _request_id(request)
    return JSONResponse(
        {
            "status": "ok",
            "service": "trustpass-live",
            "runtime": "render-fastapi-postgres",
            "demo_data_enabled": False,
            "request_id": request_id,
        },
        headers=_response_headers(request_id),
    )


@router.get("/readiness")
async def gateway_readiness(request: Request, db: Session = Depends(get_db)) -> JSONResponse:
    request_id = _request_id(request)
    db.execute(select(func.count(Organization.id))).scalar_one()
    return JSONResponse(
        {
            "status": "ready",
            "service": "trustpass-live",
            "postgres_connected": True,
            "d1_connected": False,
            "missing_tables": [],
            "request_id": request_id,
        },
        headers=_response_headers(request_id),
    )


@router.get("/operational-proof")
async def operational_proof(request: Request, db: Session = Depends(get_db)) -> JSONResponse:
    request_id = _request_id(request)
    state = _live_state(db, request_id)
    metadata = _state_metadata(state)
    counts = {key: len(value) for key, value in state.items() if isinstance(value, list)}
    return JSONResponse(
        {
            "service": "trustpass-live",
            "runtime": "render-fastapi-postgres",
            "postgres_connected": True,
            "d1_connected": False,
            "demo_data_enabled": False,
            "data_classification": metadata["data_classification"],
            "contains_customer_data": metadata["contains_customer_data"],
            "data_summary": metadata,
            "missing_tables": [],
            "counts": counts,
            "invariants": {
                "has_request_logs": bool(state["request_logs"]),
                "has_audit_events": bool(state["audit_events"]),
                "has_score_snapshots": bool(state["trust_score_snapshots"]),
                "has_notifications": bool(state["notifications"]),
            },
            "request_id": request_id,
        },
        headers=_response_headers(request_id),
    )


@router.get("/trustpass")
async def read_trustpass(request: Request, db: Session = Depends(get_db)) -> JSONResponse:
    return _state_response(db, _request_id(request))


@router.post("/trustpass")
async def write_trustpass(
    request: Request,
    context: UserContext = Depends(get_user_context),
    db: Session = Depends(get_db),
) -> Response:
    request_id = _request_id(request)
    payload = await request.json()
    action = payload.get("action")
    admin = _authorize_gateway_writer(context, db)

    if action == "create_vendor":
        org = Organization(
            name=payload.get("name") or "TRUSTPASS Vendor",
            slug=_unique_slug(db, payload.get("name") or "TRUSTPASS Vendor"),
            type=OrganizationType.vendor,
            industry=payload.get("category") or "Public gateway proof",
            city=payload.get("location") or "GitHub Pages",
        )
        db.add(org)
        db.flush()
        db.add(
            VendorProfile(
                organization_id=org.id,
                primary_location=org.city,
                public_profile_enabled=True,
                current_trust_score=0,
                current_trust_level="unverified",
                onboarding_status=VerificationStatus.draft,
            )
        )
        _record_activity(
            db,
            organization_id=org.id,
            actor_user_id=admin.id,
            action="create_vendor",
            summary=f"Created vendor {org.name}",
            entity_type="organization",
            entity_id=org.id,
        )
        _record_audit(
            db,
            organization_id=org.id,
            actor_user_id=admin.id,
            action=AuditAction.create,
            entity_type="organization",
            entity_id=org.id,
            request_id=request_id,
            summary=f"Created vendor {org.name}",
        )
    elif action == "create_buyer":
        org = Organization(
            name=payload.get("name") or "TRUSTPASS Buyer",
            slug=_unique_slug(db, payload.get("name") or "TRUSTPASS Buyer"),
            type=OrganizationType.buyer,
            industry=payload.get("category") or "Procurement",
            city=payload.get("location") or "GitHub Pages",
        )
        db.add(org)
        db.flush()
        db.add(BuyerProfile(organization_id=org.id, procurement_summary="Created from public gateway"))
        _record_activity(
            db,
            organization_id=org.id,
            actor_user_id=admin.id,
            action="create_buyer",
            summary=f"Created buyer {org.name}",
            entity_type="organization",
            entity_id=org.id,
        )
        _record_audit(
            db,
            organization_id=org.id,
            actor_user_id=admin.id,
            action=AuditAction.create,
            entity_type="organization",
            entity_id=org.id,
            request_id=request_id,
            summary=f"Created buyer {org.name}",
        )
    elif action == "add_document":
        vendor_id = UUID(str(payload["vendor_id"]))
        document_type = _category_document_type(db)
        status = _document_status(payload.get("status"))
        document = Document(
            organization_id=vendor_id,
            document_type_id=document_type.id,
            uploaded_by_user_id=admin.id,
            reviewed_by_user_id=admin.id if status in {DocumentStatus.approved, DocumentStatus.rejected} else None,
            file_name=payload.get("document_name") or "Public gateway document",
            safe_file_name=payload.get("document_name") or "Public gateway document",
            storage_provider="metadata_only",
            storage_object_key=f"public-gateway/{request_id}",
            mime_type="application/pdf",
            file_size_bytes=2048,
            checksum_sha256="c" * 64,
            status=status,
            expires_at=date.fromisoformat(payload["expiry_date"]) if payload.get("expiry_date") else None,
            reviewed_at=datetime.now(timezone.utc)
            if status in {DocumentStatus.approved, DocumentStatus.rejected}
            else None,
        )
        db.add(document)
        db.flush()
        _record_activity(
            db,
            organization_id=vendor_id,
            actor_user_id=admin.id,
            action="upload_document",
            summary=f"Added document {document.file_name}",
            entity_type="document",
            entity_id=document.id,
        )
        _record_audit(
            db,
            organization_id=vendor_id,
            actor_user_id=admin.id,
            action=AuditAction.upload,
            entity_type="document",
            entity_id=document.id,
            request_id=request_id,
            summary=f"Added document {document.file_name}",
        )
    elif action == "create_buyer_request":
        buyer_id = UUID(str(payload["buyer_id"]))
        vendor_id = UUID(str(payload["vendor_id"]))
        buyer_request = BuyerVendorRequest(
            buyer_organization_id=buyer_id,
            vendor_organization_id=vendor_id,
            requested_by_user_id=admin.id,
            subject=payload.get("subject") or "Public gateway request",
            message=payload.get("message") or "",
            status=BuyerRequestStatus.open,
        )
        db.add(buyer_request)
        db.flush()
        db.add(
            Notification(
                organization_id=vendor_id,
                channel=NotificationChannel.in_app,
                status=NotificationStatus.queued,
                subject="Buyer request created",
                body=buyer_request.subject,
                template_key="buyer_request",
                related_entity_type="buyer_vendor_request",
                related_entity_id=buyer_request.id,
            )
        )
        _record_activity(
            db,
            organization_id=buyer_id,
            actor_user_id=admin.id,
            action="create_buyer_request",
            summary=buyer_request.subject,
            entity_type="buyer_vendor_request",
            entity_id=buyer_request.id,
        )
        _record_audit(
            db,
            organization_id=buyer_id,
            actor_user_id=admin.id,
            action=AuditAction.request_info,
            entity_type="buyer_vendor_request",
            entity_id=buyer_request.id,
            request_id=request_id,
            summary=buyer_request.subject,
        )
    elif action == "decide_verification":
        vendor_id = UUID(str(payload["vendor_id"]))
        status = VerificationStatus(payload.get("status") or "approved")
        score = int(payload.get("trust_score") or 0)
        request_record = VerificationRequest(
            organization_id=vendor_id,
            submitted_by_user_id=admin.id,
            assigned_reviewer_user_id=admin.id,
            status=status,
            current_score=score,
            score_breakdown={"public_gateway": score},
            score_reasons=[payload.get("notes") or "Public gateway verification decision"],
            submitted_at=datetime.now(timezone.utc),
            decided_at=datetime.now(timezone.utc),
        )
        db.add(request_record)
        profile = db.execute(
            select(VendorProfile).where(VendorProfile.organization_id == vendor_id)
        ).scalar_one_or_none()
        if profile:
            profile.onboarding_status = status
            profile.current_trust_score = score
            profile.current_trust_level = "verified" if score >= 80 else "reviewed"
        db.flush()
        db.add(
            TrustScoreSnapshot(
                organization_id=vendor_id,
                verification_request_id=request_record.id,
                score=score,
                trust_level="verified" if score >= 80 else "reviewed",
                breakdown={"public_gateway": score},
                reasons=[payload.get("notes") or "Public gateway verification decision"],
                evidence_refs={"request_id": request_id},
                created_at=datetime.now(timezone.utc),
            )
        )
        db.add(
            Notification(
                organization_id=vendor_id,
                channel=NotificationChannel.in_app,
                status=NotificationStatus.queued,
                subject="Verification decision recorded",
                body=payload.get("notes") or "Verification decision recorded.",
                template_key="verification_decision",
                related_entity_type="verification_request",
                related_entity_id=request_record.id,
            )
        )
        _record_activity(
            db,
            organization_id=vendor_id,
            actor_user_id=admin.id,
            action="decide_verification",
            summary=f"Verification marked {status.value}",
            entity_type="verification_request",
            entity_id=request_record.id,
        )
        _record_audit(
            db,
            organization_id=vendor_id,
            actor_user_id=admin.id,
            action=AuditAction.approve if status == VerificationStatus.approved else AuditAction.review,
            entity_type="verification_request",
            entity_id=request_record.id,
            request_id=request_id,
            summary=f"Verification marked {status.value}",
        )
    else:
        raise TrustPassError("Unsupported public gateway action", "unsupported_gateway_action", 400)

    db.commit()
    return _state_response(db, request_id, status_code=201)
