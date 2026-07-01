from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import UserContext, require_roles
from app.db.session import get_db
from app.schemas.common import DataResponse
from app.services.verification_workflow import get_admin_review_queue

router = APIRouter()


@router.get("/review-queue", response_model=DataResponse)
async def review_queue(
    _: UserContext = Depends(require_roles("admin", "super_admin")),
    db: Session = Depends(get_db),
) -> DataResponse:
    return DataResponse(data={"queue": get_admin_review_queue(db)})
