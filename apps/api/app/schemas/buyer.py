from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field


class ShortlistCreate(BaseModel):
    vendor_organization_id: UUID
    notes: str | None = None


class BuyerVendorRequestCreate(BaseModel):
    vendor_organization_id: UUID
    subject: str = Field(min_length=3, max_length=240)
    message: str = Field(min_length=3)
    requested_document_type_id: UUID | None = None

