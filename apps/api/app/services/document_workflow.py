from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import TrustPassError
from app.models.document import Document, DocumentType
from app.models.enums import AuditAction, DocumentStatus
from app.schemas.document import DocumentCreate, DocumentReview
from app.services.audit import record_activity, record_audit_event

ALLOWED_MIME_TYPES = {"application/pdf", "image/png", "image/jpg", "image/jpeg"}


def list_documents(db: Session, organization_id: UUID) -> list[dict]:
    rows = db.execute(
        select(Document, DocumentType)
        .join(DocumentType, DocumentType.id == Document.document_type_id)
        .where(Document.organization_id == organization_id, Document.deleted_at.is_(None))
        .order_by(Document.created_at.desc())
    ).all()
    return [
        {
            "id": str(document.id),
            "document_type": {"id": str(document_type.id), "code": document_type.code, "name": document_type.name},
            "file_name": document.file_name,
            "mime_type": document.mime_type,
            "file_size_bytes": document.file_size_bytes,
            "status": document.status.value,
            "issued_at": document.issued_at.isoformat() if document.issued_at else None,
            "expires_at": document.expires_at.isoformat() if document.expires_at else None,
            "submitted_at": document.submitted_at.isoformat() if document.submitted_at else None,
            "reviewed_at": document.reviewed_at.isoformat() if document.reviewed_at else None,
            "rejection_notes": document.rejection_notes,
        }
        for document, document_type in rows
    ]


def create_document(
    db: Session,
    organization_id: UUID,
    actor_user_id: UUID,
    payload: DocumentCreate,
) -> Document:
    document_type = db.get(DocumentType, payload.document_type_id)
    if document_type is None or not document_type.is_active:
        raise TrustPassError("Document type not found", "document_type_not_found", 404)
    if payload.mime_type not in ALLOWED_MIME_TYPES:
        raise TrustPassError("Unsupported file type", "unsupported_file_type", 400)
    max_bytes = document_type.max_file_size_mb * 1024 * 1024
    if payload.file_size_bytes > max_bytes:
        raise TrustPassError("File exceeds maximum size", "file_too_large", 400)

    safe_file_name = payload.file_name.replace("/", "_").replace("\\", "_")
    document = Document(
        organization_id=organization_id,
        document_type_id=payload.document_type_id,
        uploaded_by_user_id=actor_user_id,
        file_name=payload.file_name,
        safe_file_name=safe_file_name,
        storage_provider="local",
        storage_object_key=payload.storage_object_key,
        mime_type=payload.mime_type,
        file_size_bytes=payload.file_size_bytes,
        checksum_sha256=payload.checksum_sha256,
        status=DocumentStatus.uploaded,
        issued_at=payload.issued_at,
        expires_at=payload.expires_at,
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(document)
    db.flush()
    record_activity(
        db,
        organization_id=organization_id,
        actor_user_id=actor_user_id,
        action="upload_document",
        summary=f"Uploaded {document_type.name}",
        entity_type="document",
        entity_id=document.id,
    )
    record_audit_event(
        db,
        organization_id=organization_id,
        actor_user_id=actor_user_id,
        action=AuditAction.upload,
        entity_type="document",
        entity_id=document.id,
        metadata={"document_type": document_type.code},
    )
    db.commit()
    db.refresh(document)
    return document


def review_document(
    db: Session,
    document_id: UUID,
    actor_user_id: UUID,
    payload: DocumentReview,
) -> Document:
    document = db.get(Document, document_id)
    if document is None or document.deleted_at is not None:
        raise TrustPassError("Document not found", "document_not_found", 404)
    if payload.status not in {DocumentStatus.approved, DocumentStatus.rejected, DocumentStatus.under_review}:
        raise TrustPassError("Review status must be approved, rejected, or under_review", "invalid_review_status", 400)

    before = {"status": document.status.value, "rejection_notes": document.rejection_notes}
    document.status = payload.status
    document.reviewed_by_user_id = actor_user_id
    document.reviewed_at = datetime.now(timezone.utc)
    document.rejection_notes = payload.rejection_notes

    record_activity(
        db,
        organization_id=document.organization_id,
        actor_user_id=actor_user_id,
        action="review_document",
        summary=f"Document marked {payload.status.value}",
        entity_type="document",
        entity_id=document.id,
    )
    record_audit_event(
        db,
        organization_id=document.organization_id,
        actor_user_id=actor_user_id,
        action=AuditAction.review,
        entity_type="document",
        entity_id=document.id,
        before_data=before,
        after_data={"status": payload.status.value, "rejection_notes": payload.rejection_notes},
    )
    db.commit()
    db.refresh(document)
    return document

