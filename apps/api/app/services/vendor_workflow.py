from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.core.errors import TrustPassError
from app.models.document import Document
from app.models.enums import AuditAction, VerificationStatus
from app.models.organization import Organization
from app.models.vendor import VendorProfile
from app.models.verification import (
    BadgeAssignment,
    TrustBadge,
    VendorChecklistProgress,
    VerificationRequest,
)
from app.schemas.vendor import VendorProfileUpdate
from app.services.audit import record_activity, record_audit_event


def _latest_verification_request(db: Session, organization_id: UUID) -> VerificationRequest | None:
    return db.execute(
        select(VerificationRequest)
        .where(VerificationRequest.organization_id == organization_id)
        .order_by(desc(VerificationRequest.created_at))
    ).scalar_one_or_none()


def get_vendor_dashboard(db: Session, organization_id: UUID) -> dict:
    org = db.get(Organization, organization_id)
    if org is None:
        raise TrustPassError("Organization not found", "organization_not_found", 404)

    profile = db.execute(
        select(VendorProfile).where(VendorProfile.organization_id == organization_id)
    ).scalar_one_or_none()
    latest_request = _latest_verification_request(db, organization_id)

    document_counts = {
        str(status): count
        for status, count in db.execute(
            select(Document.status, func.count(Document.id))
            .where(Document.organization_id == organization_id, Document.deleted_at.is_(None))
            .group_by(Document.status)
        ).all()
    }
    checklist_counts = {
        str(status): count
        for status, count in db.execute(
            select(VendorChecklistProgress.status, func.count(VendorChecklistProgress.id))
            .where(VendorChecklistProgress.organization_id == organization_id)
            .group_by(VendorChecklistProgress.status)
        ).all()
    }
    badges = db.execute(
        select(TrustBadge.name)
        .join(BadgeAssignment, BadgeAssignment.trust_badge_id == TrustBadge.id)
        .where(
            BadgeAssignment.organization_id == organization_id,
            BadgeAssignment.revoked_at.is_(None),
        )
        .order_by(TrustBadge.minimum_score.desc())
    ).scalars().all()

    return {
        "organization": {"id": str(org.id), "name": org.name, "slug": org.slug},
        "profile": {
            "business_summary": profile.business_summary if profile else None,
            "onboarding_status": profile.onboarding_status.value if profile else "draft",
            "trust_score": profile.current_trust_score if profile else 0,
            "trust_level": profile.current_trust_level if profile else "unverified",
            "public_profile_enabled": profile.public_profile_enabled if profile else False,
            "primary_location": profile.primary_location if profile else None,
            "regions_served": profile.regions_served if profile else [],
        },
        "verification": {
            "id": str(latest_request.id) if latest_request else None,
            "status": latest_request.status.value if latest_request else "draft",
            "submitted_at": latest_request.submitted_at.isoformat() if latest_request and latest_request.submitted_at else None,
        },
        "documents": document_counts,
        "checklist": checklist_counts,
        "badges": badges,
    }


def update_vendor_profile(
    db: Session,
    organization_id: UUID,
    payload: VendorProfileUpdate,
    actor_user_id: UUID | None,
) -> VendorProfile:
    profile = db.execute(
        select(VendorProfile).where(VendorProfile.organization_id == organization_id)
    ).scalar_one_or_none()
    if profile is None:
        profile = VendorProfile(organization_id=organization_id)
        db.add(profile)

    before = {
        "business_summary": profile.business_summary,
        "regions_served": profile.regions_served,
        "public_profile_enabled": profile.public_profile_enabled,
    }
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)

    record_activity(
        db,
        organization_id=organization_id,
        actor_user_id=actor_user_id,
        action="update_vendor_profile",
        summary="Vendor profile updated",
        entity_type="vendor_profile",
        entity_id=profile.id,
    )
    record_audit_event(
        db,
        organization_id=organization_id,
        actor_user_id=actor_user_id,
        action=AuditAction.update,
        entity_type="vendor_profile",
        entity_id=profile.id,
        before_data=before,
        after_data=payload.model_dump(exclude_unset=True),
    )
    db.commit()
    db.refresh(profile)
    return profile


def submit_verification_request(
    db: Session,
    organization_id: UUID,
    actor_user_id: UUID | None,
) -> VerificationRequest:
    profile = db.execute(
        select(VendorProfile).where(VendorProfile.organization_id == organization_id)
    ).scalar_one_or_none()
    if profile is None:
        raise TrustPassError("Vendor profile must exist before submission", "profile_required", 400)

    latest_request = _latest_verification_request(db, organization_id)
    if latest_request and latest_request.status in {
        VerificationStatus.submitted,
        VerificationStatus.under_review,
    }:
        raise TrustPassError("A verification request is already in review", "verification_in_progress", 409)

    now = datetime.now(timezone.utc)
    request = VerificationRequest(
        organization_id=organization_id,
        submitted_by_user_id=actor_user_id,
        status=VerificationStatus.submitted,
        current_score=profile.current_trust_score,
        score_breakdown={},
        score_reasons=["Vendor submitted onboarding for review"],
        submitted_at=now,
    )
    profile.onboarding_status = VerificationStatus.submitted
    profile.onboarding_submitted_at = now
    db.add(request)
    db.flush()

    record_activity(
        db,
        organization_id=organization_id,
        actor_user_id=actor_user_id,
        action="submit_verification",
        summary="Verification request submitted",
        entity_type="verification_request",
        entity_id=request.id,
    )
    record_audit_event(
        db,
        organization_id=organization_id,
        actor_user_id=actor_user_id,
        action=AuditAction.submit,
        entity_type="verification_request",
        entity_id=request.id,
    )
    db.commit()
    db.refresh(request)
    return request

