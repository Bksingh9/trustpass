from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, Header, HTTPException, status


@dataclass(frozen=True)
class UserContext:
    auth_subject_id: str
    user_id: UUID | None
    organization_id: UUID | None
    roles: tuple[str, ...]


async def get_user_context(
    authorization: str | None = Header(default=None),
    x_trustpass_user_id: UUID | None = Header(default=None),
    x_trustpass_organization_id: UUID | None = Header(default=None),
    x_trustpass_roles: str | None = Header(default=None),
) -> UserContext:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
        )

    roles = tuple(role.strip() for role in (x_trustpass_roles or "").split(",") if role.strip())
    return UserContext(
        auth_subject_id=authorization.replace("Bearer ", "", 1),
        user_id=x_trustpass_user_id,
        organization_id=x_trustpass_organization_id,
        roles=roles,
    )


def require_roles(*required_roles: str):
    async def dependency(context: UserContext = Depends(get_user_context)) -> UserContext:
        if not set(required_roles).intersection(context.roles):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return context

    return dependency

