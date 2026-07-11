from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.errors import TrustPassError
from app.core.security import UserContext, require_roles
from app.db.session import get_db
from app.models.document import DocumentType
from app.models.identity import User
from app.models.organization import Organization
from app.schemas.common import DataResponse
from app.services.verification_workflow import get_admin_review_queue

router = APIRouter()


def _authorize_seed_context(settings: Settings, proof_token: str | None) -> None:
    if settings.environment != "production":
        return
    if not settings.seed_context_token or proof_token != settings.seed_context_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seed context proof token required",
        )


@router.get("/review-queue", response_model=DataResponse)
async def review_queue(
    _: UserContext = Depends(require_roles("admin", "super_admin")),
    db: Session = Depends(get_db),
) -> DataResponse:
    return DataResponse(data={"queue": get_admin_review_queue(db)})


@router.get("/seed-context", response_model=DataResponse)
async def seed_context(
    _: UserContext = Depends(require_roles("super_admin")),
    x_trustpass_seed_context_token: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> DataResponse:
    _authorize_seed_context(settings, x_trustpass_seed_context_token)

    organization_slugs = [
        "brightline-procurement",
        "atlas-freight-partners",
        "clearpath-advisory",
        "trustpass-ops",
    ]
    auth_subject_ids = ["seed-buyer-1", "seed-vendor-3", "seed-admin-2"]
    document_type_codes = ["category_compliance"]

    organizations = {
        organization.slug: str(organization.id)
        for organization in db.execute(
            select(Organization).where(Organization.slug.in_(organization_slugs))
        ).scalars()
    }
    users = {
        user.auth_subject_id: str(user.id)
        for user in db.execute(
            select(User).where(User.auth_subject_id.in_(auth_subject_ids))
        ).scalars()
    }
    document_types = {
        document_type.code: str(document_type.id)
        for document_type in db.execute(
            select(DocumentType).where(DocumentType.code.in_(document_type_codes))
        ).scalars()
    }

    missing = {
        "organizations": sorted(set(organization_slugs) - set(organizations)),
        "users": sorted(set(auth_subject_ids) - set(users)),
        "document_types": sorted(set(document_type_codes) - set(document_types)),
    }
    if any(missing.values()):
        raise TrustPassError("Seed context is incomplete", "seed_context_incomplete", 409)

    return DataResponse(
        data={
            "organizations": organizations,
            "users": users,
            "document_types": document_types,
        }
    )
