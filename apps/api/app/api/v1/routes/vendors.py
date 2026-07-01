from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.security import UserContext, require_roles
from app.schemas.common import DataResponse

router = APIRouter()


@router.get("/dashboard", response_model=DataResponse)
async def vendor_dashboard(_: UserContext = Depends(require_roles("vendor", "admin", "super_admin"))) -> DataResponse:
    return DataResponse(data={"module": "vendor_dashboard", "status": "ready_for_service_implementation"})

