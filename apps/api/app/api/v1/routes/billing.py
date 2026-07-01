from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.security import UserContext, get_user_context
from app.schemas.common import DataResponse

router = APIRouter()


@router.get("/plans", response_model=DataResponse)
async def plans(_: UserContext = Depends(get_user_context)) -> DataResponse:
    return DataResponse(
        data={
            "plans": [
                {"code": "vendor_basic", "name": "Vendor Basic"},
                {"code": "vendor_growth", "name": "Vendor Growth"},
                {"code": "vendor_premium", "name": "Vendor Premium"},
                {"code": "buyer_team", "name": "Buyer Team"},
                {"code": "verification_pack", "name": "Verification Pack"},
            ]
        }
    )

