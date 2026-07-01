from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.security import UserContext, require_roles
from app.schemas.common import DataResponse

router = APIRouter()


@router.get("/", response_model=DataResponse)
async def list_documents(_: UserContext = Depends(require_roles("vendor", "admin", "super_admin"))) -> DataResponse:
    return DataResponse(data={"documents": []})

