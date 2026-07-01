from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import VerificationCheckStatus, VerificationStatus


class VerificationRequest(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "verification_requests"
    __table_args__ = (
        Index("ix_verification_requests_org_status_created", "organization_id", "status", "created_at"),
        Index("ix_verification_requests_status_reviewer", "status", "assigned_reviewer_user_id"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    submitted_by_user_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"))
    assigned_reviewer_user_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"))
    status: Mapped[VerificationStatus] = mapped_column(
        Enum(VerificationStatus, name="verification_status"),
        default=VerificationStatus.draft,
        nullable=False,
    )
    current_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    score_breakdown: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    score_reasons: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list, nullable=False)
    admin_notes: Mapped[str | None] = mapped_column(Text)
    vendor_message: Mapped[str | None] = mapped_column(Text)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    review_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)


class VerificationCheck(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "verification_checks"
    __table_args__ = (
        Index("ix_verification_checks_request_status", "verification_request_id", "status"),
        Index("ix_verification_checks_org_category", "organization_id", "category"),
    )

    verification_request_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("verification_requests.id"),
        nullable=False,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    checklist_item_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("checklist_items.id"))
    document_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("documents.id"))
    category: Mapped[str] = mapped_column(String(120), nullable=False)
    label: Mapped[str] = mapped_column(Text, nullable=False)
    weight: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[VerificationCheckStatus] = mapped_column(
        Enum(VerificationCheckStatus, name="verification_check_status"),
        default=VerificationCheckStatus.pending,
        nullable=False,
    )
    score_awarded: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    evidence_summary: Mapped[str | None] = mapped_column(Text)
    admin_notes: Mapped[str | None] = mapped_column(Text)
    reviewed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ComplianceChecklist(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "compliance_checklists"
    __table_args__ = (
        Index("ix_checklists_category_region_active", "service_category_id", "country", "region", "is_active"),
        Index("ix_checklists_default_active", "is_default", "is_active"),
    )

    name: Mapped[str] = mapped_column(Text, nullable=False)
    service_category_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("service_categories.id"))
    country: Mapped[str | None] = mapped_column(String(80))
    region: Mapped[str | None] = mapped_column(String(120))
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"))


class ChecklistItem(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "checklist_items"
    __table_args__ = (Index("ix_checklist_items_checklist_active_order", "compliance_checklist_id", "is_active", "sort_order"),)

    compliance_checklist_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("compliance_checklists.id"),
        nullable=False,
    )
    document_type_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("document_types.id"))
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(120), nullable=False)
    weight: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class VendorChecklistProgress(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "vendor_checklist_progress"
    __table_args__ = (
        UniqueConstraint("organization_id", "checklist_item_id", name="uq_vendor_checklist_progress_org_item"),
        Index("ix_vendor_checklist_progress_org_status", "organization_id", "status"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    checklist_item_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("checklist_items.id"), nullable=False)
    document_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("documents.id"))
    status: Mapped[VerificationCheckStatus] = mapped_column(
        Enum(VerificationCheckStatus, name="verification_check_status"),
        default=VerificationCheckStatus.pending,
        nullable=False,
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class TrustBadge(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "trust_badges"
    __table_args__ = (Index("ix_trust_badges_score_active", "minimum_score", "is_active"),)

    code: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    minimum_score: Mapped[int] = mapped_column(Integer, nullable=False)
    icon_name: Mapped[str | None] = mapped_column(String(120))
    color: Mapped[str | None] = mapped_column(String(40))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class BadgeAssignment(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "badge_assignments"
    __table_args__ = (Index("ix_badge_assignments_org_expires", "organization_id", "expires_at"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    trust_badge_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("trust_badges.id"), nullable=False)
    verification_request_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("verification_requests.id"),
    )
    assigned_by_user_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"))
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revocation_reason: Mapped[str | None] = mapped_column(Text)


class TrustScoreSnapshot(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "trust_score_snapshots"
    __table_args__ = (Index("ix_trust_score_snapshots_org_created", "organization_id", "created_at"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    verification_request_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("verification_requests.id"),
    )
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    trust_level: Mapped[str] = mapped_column(String(80), nullable=False)
    breakdown: Mapped[dict] = mapped_column(JSONB, nullable=False)
    reasons: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list, nullable=False)
    evidence_refs: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    calculated_by: Mapped[str] = mapped_column(String(80), default="system", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

