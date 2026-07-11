# API Spec

Base path: `/api/v1`

All authenticated routes expect `Authorization: Bearer <token>`.

Auth modes:

- `AUTH_MODE=auto`: uses development headers outside production and Supabase JWT verification in production.
- `AUTH_MODE=development_headers`: trusts `x-trustpass-user-id`, `x-trustpass-organization-id`, and `x-trustpass-roles`. Use only for local development and deterministic public demo/proof workflows.
- `AUTH_MODE=supabase_jwt`: verifies the bearer token against Supabase Auth, maps the Supabase user ID to `users.auth_subject_id`, and derives active roles from `memberships`. In this mode, requested organization context is accepted only when the authenticated user has an active membership in that organization.

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
- `PATCH /vendors/profile`: update vendor profile fields used by onboarding and trust profiles.
- `POST /vendors/submit`: submit the active vendor organization for verification.
- Future: contacts, capabilities, case studies, references, and full wizard step persistence.

## Buyers

- `GET /buyers/search`: buyer-safe vendor search.
- `GET /buyers/shortlists`: list shortlisted vendors for the active buyer organization.
- `POST /buyers/shortlists`: add a vendor to the active buyer organization's shortlist.
- `POST /buyers/requests`: request clarification or a buyer-safe document summary from a vendor.
- Future: vendor trust profile detail, shortlist removal, and vendor response endpoints.

## Documents

- `GET /documents`: list document metadata for the active organization.
- `POST /documents`: register uploaded document metadata after storage upload.
- `PATCH /documents/{document_id}/review`: admin document review decision.
- Future: create upload, confirm upload, signed preview/download URL, and replace document.

## Verification

- `GET /verification/requests`: list verification requests visible to current role.
- `PATCH /verification/checks/{check_id}`: update a verification check and awarded score.
- `PATCH /verification/requests/{request_id}/decision`: mark request under review, request changes, approve, reject, or expire.
- Future: richer verification detail read model and explicit score recalculation endpoint.

## Admin

- `GET /admin/review-queue`: admin review queue.
- `GET /admin/seed-context`: deterministic seeded proof context for deployed E2E checks. In production this requires a super-admin auth context plus `x-trustpass-seed-context-token` matching `SEED_CONTEXT_TOKEN`.
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
