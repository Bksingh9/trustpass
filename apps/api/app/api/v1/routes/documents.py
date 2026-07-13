from __future__ import annotations

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.api.v1.deps import require_context_organization, require_context_user
from app.core.config import Settings, get_settings
from app.core.errors import TrustPassError
from app.core.security import UserContext, require_roles
from app.db.session import get_db
from app.models.document import Document, DocumentType
from app.schemas.common import DataResponse
from app.schemas.document import DocumentCreate, DocumentReview
from app.services.document_workflow import create_document, list_documents, review_document
from app.services.storage import get_storage_service

router = APIRouter()


@router.get("/", response_model=DataResponse)
async def get_documents(
    context: UserContext = Depends(require_roles("vendor", "admin", "super_admin")),
    db: Session = Depends(get_db),
) -> DataResponse:
    organization_id = require_context_organization(context)
    return DataResponse(data={"documents": list_documents(db, organization_id)})


@router.post("/", response_model=DataResponse)
async def register_document(
    payload: DocumentCreate,
    context: UserContext = Depends(require_roles("vendor", "admin", "super_admin")),
    db: Session = Depends(get_db),
) -> DataResponse:
    organization_id = require_context_organization(context)
    actor_user_id = require_context_user(context)
    document = create_document(db, organization_id, actor_user_id, payload)
    return DataResponse(data={"id": str(document.id), "status": document.status.value})


@router.post("/upload", response_model=DataResponse, status_code=201)
async def upload_document(
    document_type_id: UUID = Form(...),
    file: UploadFile = File(...),
    issued_at: date | None = Form(default=None),
    expires_at: date | None = Form(default=None),
    context: UserContext = Depends(require_roles("vendor", "admin", "super_admin")),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> DataResponse:
    organization_id = require_context_organization(context)
    actor_user_id = require_context_user(context)
    document_type = db.get(DocumentType, document_type_id)
    if document_type is None or not document_type.is_active:
        raise TrustPassError("Document type not found", "document_type_not_found", 404)
    if not file.filename:
        raise TrustPassError("A file name is required", "file_name_required", 400)
    mime_type = file.content_type or "application/octet-stream"
    if mime_type not in {"application/pdf", "image/png", "image/jpg", "image/jpeg"}:
        raise TrustPassError("Unsupported file type", "unsupported_file_type", 400)
    max_bytes = min(settings.max_upload_bytes, document_type.max_file_size_mb * 1024 * 1024)
    content = await file.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise TrustPassError("File exceeds maximum size", "file_too_large", 400)

    storage = get_storage_service(settings)
    stored_object = storage.put_document(
        organization_id=organization_id,
        file_name=file.filename,
        content=content,
        mime_type=mime_type,
    )
    document = create_document(
        db,
        organization_id,
        actor_user_id,
        DocumentCreate(
            document_type_id=document_type_id,
            file_name=file.filename,
            storage_object_key=stored_object.object_key,
            mime_type=mime_type,
            file_size_bytes=stored_object.size_bytes,
            checksum_sha256=stored_object.checksum_sha256,
            issued_at=issued_at,
            expires_at=expires_at,
        ),
        stored_object=stored_object,
    )
    return DataResponse(
        data={
            "id": str(document.id),
            "status": document.status.value,
            "storage_provider": document.storage_provider,
            "storage_object_key": document.storage_object_key,
            "checksum_sha256": document.checksum_sha256,
        }
    )


@router.get("/{document_id}/download", response_model=DataResponse)
async def document_download(
    document_id: UUID,
    context: UserContext = Depends(require_roles("vendor", "admin", "super_admin")),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> DataResponse:
    document = db.get(Document, document_id)
    if document is None or document.deleted_at is not None:
        raise TrustPassError("Document not found", "document_not_found", 404)
    if "super_admin" not in context.roles and document.organization_id != require_context_organization(context):
        raise TrustPassError("Document is outside the active organization", "organization_context_mismatch", 403)
    signed_url = get_storage_service(settings).signed_url(document.storage_object_key)
    return DataResponse(
        data={
            "id": str(document.id),
            "file_name": document.file_name,
            "mime_type": document.mime_type,
            "storage_provider": document.storage_provider,
            "signed_url": signed_url,
        }
    )


@router.patch("/{document_id}/review", response_model=DataResponse)
async def review_document_route(
    document_id: UUID,
    payload: DocumentReview,
    context: UserContext = Depends(require_roles("admin", "super_admin")),
    db: Session = Depends(get_db),
) -> DataResponse:
    actor_user_id = require_context_user(context)
    document = review_document(db, document_id, actor_user_id, payload)
    return DataResponse(data={"id": str(document.id), "status": document.status.value})
