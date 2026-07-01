from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.security import UserContext, get_user_context
from app.schemas.common import DataResponse

router = APIRouter()


@router.get("/", response_model=DataResponse)
async def list_notifications(_: UserContext = Depends(get_user_context)) -> DataResponse:
    return DataResponse(data={"notifications": []})

