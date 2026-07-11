from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

import httpx
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.models.enums import MembershipStatus, UserStatus
from app.models.identity import Membership, User


@dataclass(frozen=True)
class UserContext:
    auth_subject_id: str
    user_id: UUID | None
    organization_id: UUID | None
    roles: tuple[str, ...]


def _bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
        )
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header",
        )
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header",
        )
    return token


def _resolve_auth_mode(settings: Settings) -> str:
    if settings.auth_mode != "auto":
        return settings.auth_mode
    return "supabase_jwt" if settings.environment == "production" else "development_headers"


def _development_header_context(
    *,
    token: str,
    user_id: UUID | None,
    organization_id: UUID | None,
    roles_header: str | None,
) -> UserContext:
    roles = tuple(role.strip() for role in (roles_header or "").split(",") if role.strip())
    return UserContext(
        auth_subject_id=token,
        user_id=user_id,
        organization_id=organization_id,
        roles=roles,
    )


def _context_from_memberships(
    db: Session,
    *,
    auth_subject_id: str,
    requested_organization_id: UUID | None,
) -> UserContext:
    user = db.execute(
        select(User).where(
            User.auth_subject_id == auth_subject_id,
            User.status == UserStatus.active,
        )
    ).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Active TRUSTPASS user required")

    memberships = (
        db.execute(
            select(Membership).where(
                Membership.user_id == user.id,
                Membership.status == MembershipStatus.active,
            )
        )
        .scalars()
        .all()
    )
    if not memberships:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Active membership required")

    if requested_organization_id is not None:
        memberships = [
            membership
            for membership in memberships
            if membership.organization_id == requested_organization_id
        ]
        if not memberships:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Authenticated organization context mismatch",
            )
        organization_id = requested_organization_id
    else:
        organization_ids = {membership.organization_id for membership in memberships}
        organization_id = next(iter(organization_ids)) if len(organization_ids) == 1 else None

    roles = tuple(sorted({membership.role.value for membership in memberships}))
    return UserContext(
        auth_subject_id=auth_subject_id,
        user_id=user.id,
        organization_id=organization_id,
        roles=roles,
    )


async def _verify_supabase_auth_subject(settings: Settings, token: str) -> str:
    if not settings.supabase_project_url or not settings.supabase_publishable_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase auth is not configured",
        )

    user_url = f"{settings.supabase_project_url.rstrip('/')}/auth/v1/user"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                user_url,
                headers={
                    "apikey": settings.supabase_publishable_key,
                    "authorization": f"Bearer {token}",
                },
            )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase auth verification unavailable",
        ) from exc

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Supabase access token",
        )

    try:
        payload = response.json()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Supabase auth response",
        ) from exc

    auth_subject_id = payload.get("id") or payload.get("sub")
    if not auth_subject_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Supabase auth response",
        )
    return str(auth_subject_id)


async def get_user_context(
    authorization: str | None = Header(default=None),
    x_trustpass_user_id: UUID | None = Header(default=None),
    x_trustpass_organization_id: UUID | None = Header(default=None),
    x_trustpass_roles: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> UserContext:
    token = _bearer_token(authorization)
    auth_mode = _resolve_auth_mode(settings)

    if auth_mode == "development_headers":
        return _development_header_context(
            token=token,
            user_id=x_trustpass_user_id,
            organization_id=x_trustpass_organization_id,
            roles_header=x_trustpass_roles,
        )

    if auth_mode == "supabase_jwt":
        auth_subject_id = await _verify_supabase_auth_subject(settings, token)
        return _context_from_memberships(
            db,
            auth_subject_id=auth_subject_id,
            requested_organization_id=x_trustpass_organization_id,
        )

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Unsupported auth mode",
    )


def require_roles(*required_roles: str):
    async def dependency(context: UserContext = Depends(get_user_context)) -> UserContext:
        if not set(required_roles).intersection(context.roles):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return context

    return dependency
