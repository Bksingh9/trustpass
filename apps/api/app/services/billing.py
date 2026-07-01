from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class CheckoutSession:
    provider: str
    checkout_url: str
    external_id: str


class BillingAdapter:
    provider = "base"

    def create_checkout_session(self, organization_id: UUID, plan_code: str) -> CheckoutSession:
        raise NotImplementedError


class MockBillingAdapter(BillingAdapter):
    provider = "mock"

    def create_checkout_session(self, organization_id: UUID, plan_code: str) -> CheckoutSession:
        external_id = f"mock_{organization_id}_{plan_code}"
        return CheckoutSession(
            provider=self.provider,
            checkout_url=f"https://billing.local/checkout/{external_id}",
            external_id=external_id,
        )

