from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.deps import require_context_organization
from app.core.security import UserContext, require_roles
from app.db.session import get_db
from app.schemas.common import DataResponse
from app.schemas.vendor import VendorProfileUpdate
from app.services.vendor_workflow import (
    get_vendor_dashboard,
    submit_verification_request,
    update_vendor_profile,
)

router = APIRouter()


@router.get("/dashboard", response_model=DataResponse)
async def vendor_dashboard(
    context: UserContext = Depends(require_roles("vendor", "admin", "super_admin")),
    db: Session = Depends(get_db),
) -> DataResponse:
    organization_id = require_context_organization(context)
    return DataResponse(data=get_vendor_dashboard(db, organization_id))


@router.patch("/profile", response_model=DataResponse)
async def patch_vendor_profile(
    payload: VendorProfileUpdate,
    context: UserContext = Depends(require_roles("vendor", "admin", "super_admin")),
    db: Session = Depends(get_db),
) -> DataResponse:
    organization_id = require_context_organization(context)
    profile = update_vendor_profile(db, organization_id, payload, context.user_id)
    return DataResponse(
        data={
            "id": str(profile.id),
            "organization_id": str(profile.organization_id),
            "business_summary": profile.business_summary,
            "regions_served": profile.regions_served,
            "public_profile_enabled": profile.public_profile_enabled,
            "onboarding_status": profile.onboarding_status.value,
        }
    )


@router.post("/submit", response_model=DataResponse)
async def submit_vendor_verification(
    context: UserContext = Depends(require_roles("vendor", "admin", "super_admin")),
    db: Session = Depends(get_db),
) -> DataResponse:
    organization_id = require_context_organization(context)
    request = submit_verification_request(db, organization_id, context.user_id)
    return DataResponse(
        data={
            "id": str(request.id),
            "organization_id": str(request.organization_id),
            "status": request.status.value,
            "submitted_at": request.submitted_at.isoformat() if request.submitted_at else None,
        }
    )
