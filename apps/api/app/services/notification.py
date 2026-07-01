from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class NotificationPayload:
    organization_id: UUID | None
    user_id: UUID | None
    subject: str
    body: str
    template_key: str | None = None


class EmailAdapter:
    provider = "base"

    def send(self, to_email: str, subject: str, body: str) -> None:
        raise NotImplementedError


class MockEmailAdapter(EmailAdapter):
    provider = "mock"

    def send(self, to_email: str, subject: str, body: str) -> None:
        return None

