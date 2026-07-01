from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from uuid import UUID

from app.api.v1.deps import require_context_organization, require_context_user
from app.core.security import UserContext, require_roles
from app.db.session import get_db
from app.schemas.common import DataResponse
from app.schemas.document import DocumentCreate, DocumentReview
from app.services.document_workflow import create_document, list_documents, review_document

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
