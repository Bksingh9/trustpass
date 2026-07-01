from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.security import UserContext, require_roles
from app.schemas.common import DataResponse

router = APIRouter()


@router.get("/review-queue", response_model=DataResponse)
async def review_queue(_: UserContext = Depends(require_roles("admin", "super_admin"))) -> DataResponse:
    return DataResponse(data={"queue": []})

