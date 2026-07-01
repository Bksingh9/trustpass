from __future__ import annotations

from celery import Celery

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "trustpass",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.workers.tasks"],
)

celery_app.conf.timezone = "UTC"
celery_app.conf.beat_schedule = {
    "document-expiry-reminders-daily": {
        "task": "app.workers.tasks.send_document_expiry_reminders",
        "schedule": 24 * 60 * 60,
    },
    "pending-review-reminders-daily": {
        "task": "app.workers.tasks.send_pending_review_reminders",
        "schedule": 24 * 60 * 60,
    },
}

