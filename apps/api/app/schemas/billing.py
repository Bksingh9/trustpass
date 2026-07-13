from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import PaymentStatus, SubscriptionStatus


class CheckoutCreate(BaseModel):
    plan_code: str = Field(min_length=2, max_length=120)


class BillingWebhookEvent(BaseModel):
    event_id: str = Field(min_length=2, max_length=240)
    organization_id: UUID
    payment_type: str = Field(min_length=2, max_length=120)
    status: PaymentStatus
    amount_cents: int = Field(ge=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    provider_payment_id: str = Field(min_length=2, max_length=240)
    subscription_id: UUID | None = None
    provider_subscription_id: str | None = Field(default=None, max_length=240)
    subscription_status: SubscriptionStatus | None = None
    description: str | None = Field(default=None, max_length=1000)
    metadata: dict[str, Any] = Field(default_factory=dict)

