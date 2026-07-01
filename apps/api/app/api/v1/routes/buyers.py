from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.v1.deps import require_context_organization, require_context_user
from app.core.security import UserContext, require_roles
from app.db.session import get_db
from app.schemas.buyer import BuyerVendorRequestCreate, ShortlistCreate
from app.schemas.common import DataResponse
from app.services.buyer_workflow import (
    create_buyer_request,
    create_shortlist,
    list_shortlists,
    search_vendors,
)

router = APIRouter()


@router.get("/search", response_model=DataResponse)
async def buyer_search(
    q: str | None = Query(default=None),
    category: str | None = Query(default=None),
    location: str | None = Query(default=None),
    trust_level: str | None = Query(default=None),
    badge: str | None = Query(default=None),
    capability: str | None = Query(default=None),
    _: UserContext = Depends(require_roles("buyer", "admin", "super_admin")),
    db: Session = Depends(get_db),
) -> DataResponse:
    return DataResponse(
        data={
            "vendors": search_vendors(
                db,
                q=q,
                category=category,
                location=location,
                trust_level=trust_level,
                badge=badge,
                capability=capability,
            )
        }
    )


@router.get("/shortlists", response_model=DataResponse)
async def buyer_shortlists(
    context: UserContext = Depends(require_roles("buyer", "admin", "super_admin")),
    db: Session = Depends(get_db),
) -> DataResponse:
    buyer_organization_id = require_context_organization(context)
    return DataResponse(data={"shortlists": list_shortlists(db, buyer_organization_id)})


@router.post("/shortlists", response_model=DataResponse)
async def add_shortlist(
    payload: ShortlistCreate,
    context: UserContext = Depends(require_roles("buyer", "admin", "super_admin")),
    db: Session = Depends(get_db),
) -> DataResponse:
    buyer_organization_id = require_context_organization(context)
    actor_user_id = require_context_user(context)
    shortlist = create_shortlist(db, buyer_organization_id, actor_user_id, payload)
    return DataResponse(data={"id": str(shortlist.id), "status": shortlist.status})


@router.post("/requests", response_model=DataResponse)
async def request_vendor_info(
    payload: BuyerVendorRequestCreate,
    context: UserContext = Depends(require_roles("buyer", "admin", "super_admin")),
    db: Session = Depends(get_db),
) -> DataResponse:
    buyer_organization_id = require_context_organization(context)
    actor_user_id = require_context_user(context)
    request = create_buyer_request(db, buyer_organization_id, actor_user_id, payload)
    return DataResponse(data={"id": str(request.id), "status": request.status.value})
