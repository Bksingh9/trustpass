# API Spec

Base path: `/api/v1`

All authenticated routes expect a Supabase bearer token. During local development, the backend also accepts development headers for user, organization, and role context until the Supabase JWT verifier is wired.

## Response Format

Success:

```json
{
  "data": {}
}
```

Error:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Details"
  }
}
```

## Health

- `GET /health`: service status.
- `GET /liveness`: process liveness.
- `GET /readiness`: database readiness.

## Auth

- `GET /auth/me`: current authenticated user context.
- Future: invite acceptance, membership switch, and Supabase profile sync.

## Organizations

- `GET /orgs/context`: active organization context.
- Future: create organization, update profile, invite user, list members, change role, remove member.

## Vendors

- `GET /vendors/dashboard`: vendor dashboard summary.
- Future: onboarding read/write, contacts, capabilities, case studies, references, submit verification.

## Buyers

- `GET /buyers/search`: buyer-safe vendor search.
- Future: filters, vendor trust profile detail, shortlist create/remove, buyer request create/respond.

## Documents

- `GET /documents`: list document metadata for the active organization.
- Future: create upload, confirm upload, signed preview/download URL, replace document, admin review decision.

## Verification

- `GET /verification/requests`: list verification requests visible to current role.
- Future: submit request, review checks, recalculate score, request changes, approve, reject, expire.

## Admin

- `GET /admin/review-queue`: admin review queue.
- Future: checklist manager, badge manager, verification detail, organization management, audit inspection.

## Notifications

- `GET /notifications`: current user notifications.
- Future: mark read, mark all read, notification preferences.

## Billing

- `GET /billing/plans`: supported MVP plans.
- Future: create checkout session, list subscription state, webhook handlers for Stripe and Razorpay.

## Metrics

- `GET /metrics/overview`: admin metrics summary.
- Future: review SLA, vendor funnel, buyer request volume, billing indicators.

