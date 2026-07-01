from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import BuyerRequestStatus


class BuyerProfile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "buyer_profiles"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("organizations.id"),
        unique=True,
        nullable=False,
    )
    procurement_summary: Mapped[str | None] = mapped_column(Text)
    preferred_categories: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list, nullable=False)
    regions_of_interest: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list, nullable=False)
    minimum_trust_level: Mapped[str | None] = mapped_column(String(80))


class Shortlist(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "shortlists"
    __table_args__ = (
        UniqueConstraint("buyer_organization_id", "vendor_organization_id", name="uq_shortlists_buyer_vendor"),
        Index("ix_shortlists_buyer_status", "buyer_organization_id", "status"),
    )

    buyer_organization_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    vendor_organization_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(40), default="active", nullable=False)


class BuyerVendorRequest(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "buyer_vendor_requests"
    __table_args__ = (
        Index("ix_buyer_vendor_requests_buyer_status_created", "buyer_organization_id", "status", "created_at"),
        Index("ix_buyer_vendor_requests_vendor_status_created", "vendor_organization_id", "status", "created_at"),
    )

    buyer_organization_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    vendor_organization_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    requested_by_user_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    assigned_vendor_user_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"))
    subject: Mapped[str] = mapped_column(Text, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    requested_document_type_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("document_types.id"))
    status: Mapped[BuyerRequestStatus] = mapped_column(
        Enum(BuyerRequestStatus, name="buyer_request_status"),
        default=BuyerRequestStatus.open,
        nullable=False,
    )
    response_message: Mapped[str | None] = mapped_column(Text)
    responded_by_user_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"))
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

