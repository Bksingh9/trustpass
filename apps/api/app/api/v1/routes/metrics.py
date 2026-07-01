from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.security import UserContext, require_roles
from app.schemas.common import DataResponse

router = APIRouter()


@router.get("/overview", response_model=DataResponse)
async def metrics_overview(_: UserContext = Depends(require_roles("admin", "super_admin"))) -> DataResponse:
    return DataResponse(data={"vendors": 0, "buyers": 0, "pending_reviews": 0})

