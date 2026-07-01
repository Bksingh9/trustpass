from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.security import UserContext, get_user_context
from app.schemas.common import DataResponse

router = APIRouter()


@router.get("/me", response_model=DataResponse)
async def current_user(context: UserContext = Depends(get_user_context)) -> DataResponse:
    return DataResponse(
        data={
            "auth_subject_id": context.auth_subject_id,
            "user_id": str(context.user_id) if context.user_id else None,
            "organization_id": str(context.organization_id) if context.organization_id else None,
            "roles": list(context.roles),
        }
    )

