from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import VerificationCheckStatus, VerificationStatus


class VerificationCheckUpdate(BaseModel):
    status: VerificationCheckStatus
    admin_notes: str | None = None


class VerificationDecision(BaseModel):
    status: VerificationStatus
    vendor_message: str | None = Field(default=None, max_length=2000)
    admin_notes: str | None = Field(default=None, max_length=4000)
    assigned_reviewer_user_id: UUID | None = None

