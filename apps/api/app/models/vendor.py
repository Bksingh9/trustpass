from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import VerificationCheckStatus, VerificationStatus, VisibilityLevel


class VendorProfile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "vendor_profiles"
    __table_args__ = (Index("ix_vendor_profiles_status_score", "onboarding_status", "current_trust_score"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("organizations.id"),
        unique=True,
        nullable=False,
    )
    business_summary: Mapped[str | None] = mapped_column(Text)
    year_founded: Mapped[int | None] = mapped_column(Integer)
    employee_count: Mapped[int | None] = mapped_column(Integer)
    annual_revenue_band: Mapped[str | None] = mapped_column(String(80))
    primary_location: Mapped[str | None] = mapped_column(Text)
    regions_served: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list, nullable=False)
    onboarding_status: Mapped[VerificationStatus] = mapped_column(
        Enum(VerificationStatus, name="verification_status"),
        default=VerificationStatus.draft,
        nullable=False,
    )
    onboarding_submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    current_trust_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    current_trust_level: Mapped[str | None] = mapped_column(String(80))
    public_profile_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    public_slug: Mapped[str | None] = mapped_column(String(160), unique=True)


class ServiceCategory(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "service_categories"
    __table_args__ = (Index("ix_service_categories_parent_active", "parent_id", "is_active"),)

    name: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("service_categories.id"),
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Capability(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "capabilities"
    __table_args__ = (
        UniqueConstraint("service_category_id", "slug", name="uq_capabilities_category_slug"),
        Index("ix_capabilities_category_active", "service_category_id", "is_active"),
    )

    service_category_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("service_categories.id"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class VendorCapability(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "vendor_capabilities"
    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "service_category_id",
            "capability_id",
            name="uq_vendor_capabilities_org_category_capability",
        ),
        Index("ix_vendor_capabilities_category_org", "service_category_id", "organization_id"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("organizations.id"),
        nullable=False,
    )
    service_category_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("service_categories.id"),
        nullable=False,
    )
    capability_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("capabilities.id"),
    )
    experience_years: Mapped[int | None] = mapped_column(Integer)
    notes: Mapped[str | None] = mapped_column(Text)


class CaseStudy(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "case_studies"
    __table_args__ = (
        Index("ix_case_studies_org_visibility", "organization_id", "visibility"),
        Index("ix_case_studies_industry_verified", "industry", "is_verified"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("organizations.id"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    client_name: Mapped[str | None] = mapped_column(Text)
    industry: Mapped[str | None] = mapped_column(Text)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    outcomes: Mapped[str | None] = mapped_column(Text)
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    visibility: Mapped[VisibilityLevel] = mapped_column(
        Enum(VisibilityLevel, name="visibility_level"),
        default=VisibilityLevel.buyer_summary,
        nullable=False,
    )
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verified_by_user_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"))
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class VendorReference(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "vendor_references"
    __table_args__ = (Index("ix_vendor_references_org_status", "organization_id", "validation_status"),)

    organization_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("organizations.id"),
        nullable=False,
    )
    reference_name: Mapped[str] = mapped_column(Text, nullable=False)
    reference_company: Mapped[str | None] = mapped_column(Text)
    reference_title: Mapped[str | None] = mapped_column(Text)
    reference_email: Mapped[str | None] = mapped_column(String(320), index=True)
    reference_phone: Mapped[str | None] = mapped_column(String(60))
    relationship: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    visibility: Mapped[VisibilityLevel] = mapped_column(
        Enum(VisibilityLevel, name="visibility_level"),
        default=VisibilityLevel.private,
        nullable=False,
    )
    validation_status: Mapped[VerificationCheckStatus] = mapped_column(
        Enum(VerificationCheckStatus, name="verification_check_status"),
        default=VerificationCheckStatus.pending,
        nullable=False,
    )
    validated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"))
    validated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

