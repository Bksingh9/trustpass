from __future__ import annotations

from app.workers.celery_app import celery_app


@celery_app.task(name="app.workers.tasks.send_document_expiry_reminders")
def send_document_expiry_reminders() -> dict[str, str]:
    return {"status": "scheduled"}


@celery_app.task(name="app.workers.tasks.send_pending_review_reminders")
def send_pending_review_reminders() -> dict[str, str]:
    return {"status": "scheduled"}

