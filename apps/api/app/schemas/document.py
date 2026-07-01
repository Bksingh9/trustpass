from __future__ import annotations

from datetime import date
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import DocumentStatus


class DocumentCreate(BaseModel):
    document_type_id: UUID
    file_name: str = Field(min_length=1, max_length=255)
    storage_object_key: str = Field(min_length=1)
    mime_type: str
    file_size_bytes: int = Field(gt=0)
    checksum_sha256: str | None = Field(default=None, max_length=64)
    issued_at: date | None = None
    expires_at: date | None = None


class DocumentReview(BaseModel):
    status: DocumentStatus
    rejection_notes: str | None = None

