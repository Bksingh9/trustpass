from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.core.security import UserContext, get_user_context
from app.db.session import get_db
from app.models.notification import Notification
from app.schemas.common import DataResponse

router = APIRouter()


@router.get("/", response_model=DataResponse)
async def list_notifications(
    context: UserContext = Depends(get_user_context),
    db: Session = Depends(get_db),
) -> DataResponse:
    if context.organization_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authenticated organization context required",
        )

    statement = select(Notification).order_by(desc(Notification.created_at)).limit(50)
    statement = statement.where(Notification.organization_id == context.organization_id)
    if context.user_id:
        statement = statement.where(Notification.user_id == context.user_id)
    notifications = db.execute(statement).scalars().all()
    return DataResponse(
        data={
            "notifications": [
                {
                    "id": str(item.id),
                    "channel": item.channel.value,
                    "status": item.status.value,
                    "subject": item.subject,
                    "body": item.body,
                    "created_at": item.created_at.isoformat(),
                    "read_at": item.read_at.isoformat() if item.read_at else None,
                }
                for item in notifications
            ]
        }
    )
