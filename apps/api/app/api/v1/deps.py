from __future__ import annotations

from uuid import UUID

from app.core.errors import TrustPassError
from app.core.security import UserContext


def require_context_organization(context: UserContext) -> UUID:
    if context.organization_id is None:
        raise TrustPassError("Active organization context is required", "organization_context_required", 400)
    return context.organization_id


def require_context_user(context: UserContext) -> UUID:
    if context.user_id is None:
        raise TrustPassError("User context is required", "user_context_required", 400)
    return context.user_id

