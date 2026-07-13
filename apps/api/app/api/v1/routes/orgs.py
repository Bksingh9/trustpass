from __future__ import annotations

import re

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import TrustPassError
from app.core.security import AuthSubject, UserContext, get_auth_subject, get_user_context
from app.db.session import get_db
from app.models.enums import AuditAction, MembershipRole, MembershipStatus, OrganizationType, UserStatus
from app.models.identity import Membership, User
from app.models.organization import Organization
from app.schemas.common import DataResponse
from app.schemas.organization import OrganizationCreate
from app.services.audit import record_activity, record_audit_event

router = APIRouter()


@router.get("/context", response_model=DataResponse)
async def organization_context(context: UserContext = Depends(get_user_context)) -> DataResponse:
    return DataResponse(data={"organization_id": str(context.organization_id) if context.organization_id else None})


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "organization"


@router.post("/", response_model=DataResponse, status_code=status.HTTP_201_CREATED)
async def create_organization(
    payload: OrganizationCreate,
    subject: AuthSubject = Depends(get_auth_subject),
    db: Session = Depends(get_db),
) -> DataResponse:
    if payload.type == OrganizationType.internal:
        raise TrustPassError("Internal organizations can only be created by TRUSTPASS operators", "internal_org_forbidden", 403)

    email = payload.email or subject.email
    if not email:
        raise TrustPassError("An account email is required to create an organization", "email_required", 400)

    user = db.execute(select(User).where(User.auth_subject_id == subject.auth_subject_id)).scalar_one_or_none()
    if user is None:
        existing_email = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
        if existing_email is not None:
            raise TrustPassError("Email is already linked to another auth subject", "email_conflict", 409)
        user = User(
            auth_subject_id=subject.auth_subject_id,
            email=email,
            full_name=payload.full_name or subject.full_name,
            status=UserStatus.active,
        )
        db.add(user)
        db.flush()
    elif user.status != UserStatus.active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is not active")

    base_slug = _slugify(payload.name)
    slug = base_slug
    suffix = 2
    while db.execute(select(Organization.id).where(Organization.slug == slug)).scalar_one_or_none() is not None:
        slug = f"{base_slug}-{suffix}"
        suffix += 1

    organization = Organization(
        name=payload.name,
        slug=slug,
        type=payload.type,
        legal_name=payload.legal_name,
        website_url=payload.website_url,
        industry=payload.industry,
        country=payload.country,
        region=payload.region,
        city=payload.city,
    )
    db.add(organization)
    db.flush()
    role = MembershipRole.vendor if payload.type == OrganizationType.vendor else MembershipRole.buyer
    db.add(
        Membership(
            organization_id=organization.id,
            user_id=user.id,
            role=role,
            role_id=None,
            status=MembershipStatus.active,
            accepted_at=organization.created_at,
        )
    )
    record_activity(
        db,
        organization_id=organization.id,
        actor_user_id=user.id,
        action="create_organization",
        summary=f"Created {payload.type.value} organization",
        entity_type="organization",
        entity_id=organization.id,
    )
    record_audit_event(
        db,
        organization_id=organization.id,
        actor_user_id=user.id,
        action=AuditAction.create,
        entity_type="organization",
        entity_id=organization.id,
        metadata={"organization_type": payload.type.value},
    )
    db.commit()
    db.refresh(organization)
    return DataResponse(
        data={
            "organization": {
                "id": str(organization.id),
                "name": organization.name,
                "slug": organization.slug,
                "type": organization.type.value,
            },
            "user": {"id": str(user.id), "email": user.email},
            "role": role.value,
        }
    )


@router.get("/memberships", response_model=DataResponse)
async def memberships(
    context: UserContext = Depends(get_user_context),
    db: Session = Depends(get_db),
) -> DataResponse:
    if context.user_id is None:
        raise TrustPassError("User context is required", "user_context_required", 400)
    rows = db.execute(
        select(Membership, Organization)
        .join(Organization, Organization.id == Membership.organization_id)
        .where(Membership.user_id == context.user_id, Membership.status == MembershipStatus.active)
        .order_by(Organization.name)
    ).all()
    return DataResponse(
        data={
            "memberships": [
                {
                    "organization_id": str(membership.organization_id),
                    "organization_name": organization.name,
                    "organization_type": organization.type.value,
                    "role": membership.role.value,
                }
                for membership, organization in rows
            ]
        }
    )
