# Billing

TRUSTPASS billing is designed as an adapter-driven architecture. The MVP can run with mock billing locally while remaining ready for Stripe and Razorpay.

## Plans

- `vendor_basic`: profile, onboarding, document vault.
- `vendor_growth`: verification, trust badge, reminders.
- `vendor_premium`: assisted verification packs and priority review.
- `buyer_team`: buyer search, shortlists, requests.
- `verification_pack`: one-time assisted verification purchase.

## Data Model

- `subscriptions`: organization plan state, provider IDs, current billing period, feature flags.
- `payment_records`: payment attempts, one-time purchases, successful charges, refunds.

## Adapter Responsibilities

- Create checkout sessions.
- Normalize provider customer and subscription IDs.
- Handle payment success, failure, refund, and cancellation events.
- Return a consistent local billing result to services.

## Webhooks

Webhook handlers should validate provider signatures, normalize events, update subscriptions or payment records, and write audit events. Live webhooks are not required for the first local MVP pass.

## Plan Enforcement

Backend services should enforce plan limits. UI should reflect backend decisions but never be the only enforcement layer.

