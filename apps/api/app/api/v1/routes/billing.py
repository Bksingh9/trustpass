from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.v1.deps import require_context_organization, require_context_user
from app.core.config import Settings, get_settings
from app.core.errors import TrustPassError
from app.core.security import UserContext, get_user_context, require_roles
from app.db.session import get_db
from app.models.billing import PaymentRecord, Subscription
from app.models.enums import AuditAction, PaymentProvider, PaymentStatus, SubscriptionStatus
from app.schemas.common import DataResponse
from app.schemas.billing import BillingWebhookEvent, CheckoutCreate
from app.services.audit import record_audit_event
from app.services.billing import MockBillingAdapter

router = APIRouter()

PLAN_CATALOG = {
    "vendor_basic": {"name": "Vendor Basic", "amount_cents": 2900, "payment_type": "subscription"},
    "vendor_growth": {"name": "Vendor Growth", "amount_cents": 7900, "payment_type": "subscription"},
    "vendor_premium": {"name": "Vendor Premium", "amount_cents": 14900, "payment_type": "subscription"},
    "buyer_team": {"name": "Buyer Team", "amount_cents": 9900, "payment_type": "subscription"},
    "verification_pack": {"name": "Verification Pack", "amount_cents": 4900, "payment_type": "verification_pack"},
}


@router.get("/plans", response_model=DataResponse)
async def plans(_: UserContext = Depends(get_user_context)) -> DataResponse:
    return DataResponse(
        data={
            "plans": [
                {"code": code, **details}
                for code, details in PLAN_CATALOG.items()
            ]
        }
    )


@router.get("/subscription", response_model=DataResponse)
async def subscription(
    context: UserContext = Depends(require_roles("vendor", "buyer", "admin", "super_admin")),
    db: Session = Depends(get_db),
) -> DataResponse:
    organization_id = require_context_organization(context)
    item = db.execute(
        select(Subscription)
        .where(Subscription.organization_id == organization_id)
        .order_by(desc(Subscription.created_at))
        .limit(1)
    ).scalar_one_or_none()
    if item is None:
        return DataResponse(data={"subscription": None})
    return DataResponse(
        data={
            "subscription": {
                "id": str(item.id),
                "plan_code": item.plan_code,
                "plan_name": item.plan_name,
                "status": item.status.value,
                "provider": item.provider.value,
                "current_period_start": item.current_period_start.isoformat() if item.current_period_start else None,
                "current_period_end": item.current_period_end.isoformat() if item.current_period_end else None,
            }
        }
    )


@router.post("/checkout", response_model=DataResponse, status_code=status.HTTP_201_CREATED)
async def checkout(
    payload: CheckoutCreate,
    context: UserContext = Depends(require_roles("vendor", "buyer", "admin", "super_admin")),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> DataResponse:
    organization_id = require_context_organization(context)
    actor_user_id = require_context_user(context)
    plan = PLAN_CATALOG.get(payload.plan_code)
    if plan is None:
        raise TrustPassError("Unknown billing plan", "unknown_billing_plan", 400)
    if settings.billing_provider != "mock":
        raise HTTPException(status_code=503, detail="Configured billing provider is not implemented")

    checkout_session = MockBillingAdapter().create_checkout_session(organization_id, payload.plan_code)
    subscription = Subscription(
        organization_id=organization_id,
        plan_code=payload.plan_code,
        plan_name=plan["name"],
        status=SubscriptionStatus.trialing,
        provider=PaymentProvider.mock,
        provider_subscription_id=checkout_session.external_id,
        feature_flags={"verification_pack": payload.plan_code == "verification_pack"},
    )
    db.add(subscription)
    db.flush()
    payment = PaymentRecord(
        organization_id=organization_id,
        subscription_id=subscription.id,
        provider=PaymentProvider.mock,
        provider_payment_id=f"{checkout_session.external_id}:payment",
        payment_type=plan["payment_type"],
        amount_cents=plan["amount_cents"],
        currency="USD",
        status=PaymentStatus.pending,
        description=f"{plan['name']} checkout",
        metadata_json={"checkout_external_id": checkout_session.external_id},
    )
    db.add(payment)
    record_audit_event(
        db,
        organization_id=organization_id,
        actor_user_id=actor_user_id,
        action=AuditAction.billing_event,
        entity_type="subscription",
        entity_id=subscription.id,
        metadata={"event": "checkout_created", "plan_code": payload.plan_code},
    )
    db.commit()
    return DataResponse(
        data={
            "subscription_id": str(subscription.id),
            "payment_id": str(payment.id),
            "provider": checkout_session.provider,
            "checkout_url": checkout_session.checkout_url,
            "external_id": checkout_session.external_id,
            "status": payment.status.value,
        }
    )


@router.post("/webhooks/{provider}", response_model=DataResponse)
async def billing_webhook(
    provider: PaymentProvider,
    payload: BillingWebhookEvent,
    x_trustpass_webhook_secret: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> DataResponse:
    if settings.billing_webhook_secret:
        if x_trustpass_webhook_secret != settings.billing_webhook_secret:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook secret")
    elif settings.environment == "production":
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Billing webhook secret is not configured")
    if provider != PaymentProvider.mock:
        raise HTTPException(status_code=501, detail="Billing provider adapter is not implemented")

    payment = db.execute(
        select(PaymentRecord).where(
            PaymentRecord.provider == provider,
            PaymentRecord.provider_payment_id == payload.provider_payment_id,
        )
    ).scalar_one_or_none()
    if payment is None:
        payment = PaymentRecord(
            organization_id=payload.organization_id,
            subscription_id=payload.subscription_id,
            provider=provider,
            provider_payment_id=payload.provider_payment_id,
            payment_type=payload.payment_type,
            amount_cents=payload.amount_cents,
            currency=payload.currency.upper(),
            status=payload.status,
            description=payload.description,
            metadata_json={"event_id": payload.event_id, **payload.metadata},
        )
        db.add(payment)
    else:
        payment.status = payload.status
        payment.metadata_json = {**payment.metadata_json, "event_id": payload.event_id, **payload.metadata}
    if payload.status == PaymentStatus.succeeded and payment.paid_at is None:
        payment.paid_at = datetime.now(timezone.utc)

    subscription = None
    if payload.subscription_id:
        subscription = db.get(Subscription, payload.subscription_id)
    elif payload.provider_subscription_id:
        subscription = db.execute(
            select(Subscription).where(Subscription.provider_subscription_id == payload.provider_subscription_id)
        ).scalar_one_or_none()
    if subscription and subscription.organization_id != payload.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Billing organization mismatch")
    if subscription and payload.subscription_status:
        subscription.status = payload.subscription_status
    db.flush()
    record_audit_event(
        db,
        organization_id=payload.organization_id,
        action=AuditAction.billing_event,
        entity_type="payment_record",
        entity_id=payment.id,
        metadata={"event_id": payload.event_id, "provider": provider.value},
    )
    db.commit()
    return DataResponse(data={"accepted": True, "payment_id": str(payment.id), "status": payment.status.value})
