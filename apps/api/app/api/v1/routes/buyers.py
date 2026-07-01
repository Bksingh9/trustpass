from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.security import UserContext, require_roles
from app.schemas.common import DataResponse

router = APIRouter()


@router.get("/search", response_model=DataResponse)
async def buyer_search(_: UserContext = Depends(require_roles("buyer", "admin", "super_admin"))) -> DataResponse:
    return DataResponse(data={"vendors": [], "filters": {}})

