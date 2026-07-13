from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.v1.deps import require_context_organization
from app.core.security import UserContext, require_roles
from app.db.session import get_db
from app.models.audit import ActivityLog, AuditEvent
from app.schemas.common import DataResponse

router = APIRouter()


def _requested_organization(context: UserContext, organization_id: UUID | None) -> UUID | None:
    if "super_admin" in context.roles:
        return organization_id

    current_organization_id = require_context_organization(context)
    if organization_id is not None and organization_id != current_organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authenticated organization context mismatch",
        )
    return current_organization_id


@router.get("/events", response_model=DataResponse)
async def audit_events(
    organization_id: UUID | None = Query(default=None),
    context: UserContext = Depends(require_roles("admin", "super_admin")),
    db: Session = Depends(get_db),
) -> DataResponse:
    statement = select(AuditEvent).order_by(desc(AuditEvent.created_at)).limit(100)
    requested_organization_id = _requested_organization(context, organization_id)
    if requested_organization_id:
        statement = statement.where(AuditEvent.organization_id == requested_organization_id)

    events = db.execute(statement).scalars().all()
    return DataResponse(
        data={
            "events": [
                {
                    "id": str(event.id),
                    "organization_id": str(event.organization_id) if event.organization_id else None,
                    "actor_user_id": str(event.actor_user_id) if event.actor_user_id else None,
                    "action": event.action.value,
                    "entity_type": event.entity_type,
                    "entity_id": str(event.entity_id) if event.entity_id else None,
                    "metadata": event.metadata_json,
                    "created_at": event.created_at.isoformat(),
                }
                for event in events
            ]
        }
    )


@router.get("/activity", response_model=DataResponse)
async def activity_logs(
    organization_id: UUID | None = Query(default=None),
    context: UserContext = Depends(require_roles("admin", "super_admin")),
    db: Session = Depends(get_db),
) -> DataResponse:
    statement = select(ActivityLog).order_by(desc(ActivityLog.created_at)).limit(100)
    requested_organization_id = _requested_organization(context, organization_id)
    if requested_organization_id:
        statement = statement.where(ActivityLog.organization_id == requested_organization_id)

    logs = db.execute(statement).scalars().all()
    return DataResponse(
        data={
            "activity": [
                {
                    "id": str(log.id),
                    "organization_id": str(log.organization_id),
                    "actor_user_id": str(log.actor_user_id) if log.actor_user_id else None,
                    "action": log.action,
                    "summary": log.summary,
                    "entity_type": log.entity_type,
                    "entity_id": str(log.entity_id) if log.entity_id else None,
                    "created_at": log.created_at.isoformat(),
                }
                for log in logs
            ]
        }
    )
