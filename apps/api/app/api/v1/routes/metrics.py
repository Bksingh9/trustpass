from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import UserContext, require_roles
from app.db.session import get_db
from app.models.enums import OrganizationType, VerificationStatus
from app.models.organization import Organization
from app.models.verification import VerificationRequest
from app.schemas.common import DataResponse

router = APIRouter()


@router.get("/overview", response_model=DataResponse)
async def metrics_overview(
    _: UserContext = Depends(require_roles("admin", "super_admin")),
    db: Session = Depends(get_db),
) -> DataResponse:
    vendors = db.scalar(select(func.count(Organization.id)).where(Organization.type == OrganizationType.vendor))
    buyers = db.scalar(select(func.count(Organization.id)).where(Organization.type == OrganizationType.buyer))
    pending_reviews = db.scalar(
        select(func.count(VerificationRequest.id)).where(
            VerificationRequest.status.in_([VerificationStatus.submitted, VerificationStatus.under_review])
        )
    )
    return DataResponse(
        data={"vendors": vendors or 0, "buyers": buyers or 0, "pending_reviews": pending_reviews or 0}
    )
