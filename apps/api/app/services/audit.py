from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.audit import ActivityLog, AuditEvent
from app.models.enums import AuditAction


def record_activity(
    db: Session,
    *,
    organization_id: UUID,
    action: str,
    summary: str,
    actor_user_id: UUID | None = None,
    entity_type: str | None = None,
    entity_id: UUID | None = None,
) -> None:
    db.add(
        ActivityLog(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action=action,
            summary=summary,
            entity_type=entity_type,
            entity_id=entity_id,
            created_at=datetime.now(timezone.utc),
        )
    )


def record_audit_event(
    db: Session,
    *,
    action: AuditAction,
    entity_type: str,
    organization_id: UUID | None = None,
    actor_user_id: UUID | None = None,
    entity_id: UUID | None = None,
    before_data: dict | None = None,
    after_data: dict | None = None,
    metadata: dict | None = None,
) -> None:
    db.add(
        AuditEvent(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            before_data=before_data,
            after_data=after_data,
            metadata_json=metadata or {},
            created_at=datetime.now(timezone.utc),
        )
    )

