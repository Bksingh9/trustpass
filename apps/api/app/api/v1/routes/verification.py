from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from uuid import UUID

from app.api.v1.deps import require_context_organization, require_context_user
from app.core.security import UserContext, require_roles
from app.db.session import get_db
from app.schemas.common import DataResponse
from app.schemas.verification import VerificationCheckUpdate, VerificationDecision
from app.services.verification_workflow import (
    decide_verification_request,
    list_verification_requests as list_verification_request_records,
    update_check,
)

router = APIRouter()


@router.get("/requests", response_model=DataResponse)
async def list_verification_requests(
    context: UserContext = Depends(require_roles("vendor", "admin", "super_admin")),
    db: Session = Depends(get_db),
) -> DataResponse:
    organization_id = None if {"admin", "super_admin"}.intersection(context.roles) else require_context_organization(context)
    return DataResponse(
        data={
            "verification_requests": list_verification_request_records(
                db,
                organization_id=organization_id,
            )
        }
    )


@router.patch("/checks/{check_id}", response_model=DataResponse)
async def patch_verification_check(
    check_id: UUID,
    payload: VerificationCheckUpdate,
    context: UserContext = Depends(require_roles("admin", "super_admin")),
    db: Session = Depends(get_db),
) -> DataResponse:
    actor_user_id = require_context_user(context)
    check = update_check(db, check_id, actor_user_id, payload)
    return DataResponse(
        data={"id": str(check.id), "status": check.status.value, "score_awarded": check.score_awarded}
    )


@router.patch("/requests/{request_id}/decision", response_model=DataResponse)
async def decide_request(
    request_id: UUID,
    payload: VerificationDecision,
    context: UserContext = Depends(require_roles("admin", "super_admin")),
    db: Session = Depends(get_db),
) -> DataResponse:
    actor_user_id = require_context_user(context)
    request = decide_verification_request(db, request_id, actor_user_id, payload)
    return DataResponse(
        data={
            "id": str(request.id),
            "status": request.status.value,
            "current_score": request.current_score,
            "decided_at": request.decided_at.isoformat() if request.decided_at else None,
        }
    )
