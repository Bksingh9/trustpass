from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.security import UserContext, get_user_context
from app.schemas.common import DataResponse

router = APIRouter()


@router.get("/context", response_model=DataResponse)
async def organization_context(context: UserContext = Depends(get_user_context)) -> DataResponse:
    return DataResponse(data={"organization_id": str(context.organization_id) if context.organization_id else None})

