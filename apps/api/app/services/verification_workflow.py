from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.core.errors import TrustPassError
from app.models.enums import AuditAction, VerificationCheckStatus, VerificationStatus
from app.models.notification import Notification
from app.models.enums import NotificationChannel, NotificationStatus
from app.models.organization import Organization
from app.models.vendor import VendorProfile
from app.models.verification import (
    BadgeAssignment,
    TrustBadge,
    TrustScoreSnapshot,
    VerificationCheck,
    VerificationRequest,
)
from app.schemas.verification import VerificationCheckUpdate, VerificationDecision
from app.services.audit import record_activity, record_audit_event
from app.services.trust_scoring import ScoreInput, calculate_trust_score


def list_verification_requests(
    db: Session,
    *,
    organization_id: UUID | None = None,
    statuses: list[VerificationStatus] | None = None,
) -> list[dict]:
    statement = (
        select(VerificationRequest, Organization)
        .join(Organization, Organization.id == VerificationRequest.organization_id)
        .order_by(desc(VerificationRequest.created_at))
    )
    if organization_id:
        statement = statement.where(VerificationRequest.organization_id == organization_id)
    if statuses:
        statement = statement.where(VerificationRequest.status.in_(statuses))

    rows = db.execute(statement).all()
    return [
        {
            "id": str(request.id),
            "organization_id": str(org.id),
            "vendor_name": org.name,
            "status": request.status.value,
            "current_score": request.current_score,
            "submitted_at": request.submitted_at.isoformat() if request.submitted_at else None,
            "assigned_reviewer_user_id": str(request.assigned_reviewer_user_id) if request.assigned_reviewer_user_id else None,
        }
        for request, org in rows
    ]


def get_admin_review_queue(db: Session) -> list[dict]:
    rows = db.execute(
        select(VerificationRequest, Organization, func.count(VerificationCheck.id))
        .join(Organization, Organization.id == VerificationRequest.organization_id)
        .outerjoin(VerificationCheck, VerificationCheck.verification_request_id == VerificationRequest.id)
        .where(
            VerificationRequest.status.in_(
                [
                    VerificationStatus.submitted,
                    VerificationStatus.under_review,
                    VerificationStatus.changes_requested,
                ]
            )
        )
        .group_by(VerificationRequest.id, Organization.id)
        .order_by(VerificationRequest.submitted_at.asc().nulls_last())
    ).all()
    return [
        {
            "id": str(request.id),
            "vendor_organization_id": str(org.id),
            "vendor_name": org.name,
            "status": request.status.value,
            "current_score": request.current_score,
            "submitted_at": request.submitted_at.isoformat() if request.submitted_at else None,
            "check_count": check_count,
        }
        for request, org, check_count in rows
    ]


def update_check(
    db: Session,
    check_id: UUID,
    actor_user_id: UUID,
    payload: VerificationCheckUpdate,
) -> VerificationCheck:
    check = db.get(VerificationCheck, check_id)
    if check is None:
        raise TrustPassError("Verification check not found", "check_not_found", 404)
    before = {"status": check.status.value, "admin_notes": check.admin_notes}
    check.status = payload.status
    check.admin_notes = payload.admin_notes
    check.reviewed_by_user_id = actor_user_id
    check.reviewed_at = datetime.now(timezone.utc)
    check.score_awarded = check.weight if payload.status == VerificationCheckStatus.passed else 0

    record_audit_event(
        db,
        organization_id=check.organization_id,
        actor_user_id=actor_user_id,
        action=AuditAction.review,
        entity_type="verification_check",
        entity_id=check.id,
        before_data=before,
        after_data={"status": check.status.value, "admin_notes": check.admin_notes},
    )
    db.commit()
    db.refresh(check)
    return check


def recalculate_request_score(db: Session, request: VerificationRequest) -> None:
    checks = db.execute(
        select(VerificationCheck).where(VerificationCheck.verification_request_id == request.id)
    ).scalars().all()
    score_inputs = [
        ScoreInput(category=check.category, status=check.status, weight=check.weight) for check in checks
    ]
    result = calculate_trust_score(score_inputs)
    request.current_score = result.score
    request.score_breakdown = result.breakdown
    request.score_reasons = result.reasons

    profile = db.execute(
        select(VendorProfile).where(VendorProfile.organization_id == request.organization_id)
    ).scalar_one_or_none()
    if profile:
        profile.current_trust_score = result.score
        profile.current_trust_level = result.trust_level
        profile.onboarding_status = request.status

    db.add(
        TrustScoreSnapshot(
            organization_id=request.organization_id,
            verification_request_id=request.id,
            score=result.score,
            trust_level=result.trust_level,
            breakdown=result.breakdown,
            reasons=result.reasons,
            evidence_refs={"verification_request_id": str(request.id)},
            created_at=datetime.now(timezone.utc),
        )
    )


def decide_verification_request(
    db: Session,
    request_id: UUID,
    actor_user_id: UUID,
    payload: VerificationDecision,
) -> VerificationRequest:
    request = db.get(VerificationRequest, request_id)
    if request is None:
        raise TrustPassError("Verification request not found", "verification_request_not_found", 404)
    if payload.status not in {
        VerificationStatus.under_review,
        VerificationStatus.changes_requested,
        VerificationStatus.approved,
        VerificationStatus.rejected,
        VerificationStatus.expired,
    }:
        raise TrustPassError("Invalid verification decision status", "invalid_verification_status", 400)

    before = {"status": request.status.value, "current_score": request.current_score}
    request.status = payload.status
    request.admin_notes = payload.admin_notes
    request.vendor_message = payload.vendor_message
    request.assigned_reviewer_user_id = payload.assigned_reviewer_user_id or actor_user_id
    if payload.status in {VerificationStatus.approved, VerificationStatus.rejected, VerificationStatus.expired}:
        request.decided_at = datetime.now(timezone.utc)
    if payload.status == VerificationStatus.under_review and request.review_started_at is None:
        request.review_started_at = datetime.now(timezone.utc)

    recalculate_request_score(db, request)
    _assign_badges_if_approved(db, request, actor_user_id)
    _queue_vendor_notification(db, request)

    record_activity(
        db,
        organization_id=request.organization_id,
        actor_user_id=actor_user_id,
        action="decide_verification",
        summary=f"Verification marked {payload.status.value}",
        entity_type="verification_request",
        entity_id=request.id,
    )
    record_audit_event(
        db,
        organization_id=request.organization_id,
        actor_user_id=actor_user_id,
        action=_audit_action_for_status(payload.status),
        entity_type="verification_request",
        entity_id=request.id,
        before_data=before,
        after_data={"status": request.status.value, "current_score": request.current_score},
    )
    db.commit()
    db.refresh(request)
    return request


def _assign_badges_if_approved(db: Session, request: VerificationRequest, actor_user_id: UUID) -> None:
    if request.status != VerificationStatus.approved:
        return
    badges = db.execute(
        select(TrustBadge)
        .where(TrustBadge.is_active.is_(True), TrustBadge.minimum_score <= request.current_score)
        .order_by(TrustBadge.minimum_score.asc())
    ).scalars().all()
    existing_badge_ids = set(
        db.execute(
            select(BadgeAssignment.trust_badge_id).where(
                BadgeAssignment.organization_id == request.organization_id,
                BadgeAssignment.revoked_at.is_(None),
            )
        ).scalars().all()
    )
    now = datetime.now(timezone.utc)
    for badge in badges:
        if badge.id in existing_badge_ids:
            continue
        db.add(
            BadgeAssignment(
                organization_id=request.organization_id,
                trust_badge_id=badge.id,
                verification_request_id=request.id,
                assigned_by_user_id=actor_user_id,
                assigned_at=now,
            )
        )


def _queue_vendor_notification(db: Session, request: VerificationRequest) -> None:
    db.add(
        Notification(
            organization_id=request.organization_id,
            user_id=request.submitted_by_user_id,
            channel=NotificationChannel.in_app,
            status=NotificationStatus.queued,
            subject="Verification status updated",
            body=f"Your verification request is now {request.status.value}.",
            related_entity_type="verification_request",
            related_entity_id=request.id,
        )
    )


def _audit_action_for_status(status: VerificationStatus) -> AuditAction:
    if status == VerificationStatus.approved:
        return AuditAction.approve
    if status == VerificationStatus.rejected:
        return AuditAction.reject
    if status == VerificationStatus.changes_requested:
        return AuditAction.request_changes
    return AuditAction.review

