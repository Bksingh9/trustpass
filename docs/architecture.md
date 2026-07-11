# TRUSTPASS Architecture

## System Overview

TRUSTPASS is an API-first, multi-tenant B2B SaaS application.

Major components:

- Next.js 14 web app for public pages, vendor workflows, buyer workflows, and admin console.
- FastAPI backend for API routes, RBAC, workflows, persistence, integrations, and business logic.
- PostgreSQL database for normalized tenant data and audit history.
- Redis for Celery queueing and lightweight cache use.
- Celery workers for reminders, notifications, digest jobs, badge expiry, and asynchronous event processing.
- Supabase Auth for user credentials, sessions, password reset, and external auth identity.
- S3-compatible storage abstraction for sensitive uploaded documents.
- Billing adapter layer for Stripe and Razorpay readiness.
- Email adapter layer for Resend or Postmark readiness.

## Architecture Principles

- API-first: the web app consumes versioned API routes under `/api/v1`.
- Multi-tenant by organization: most business records are anchored to `organization_id`.
- Role-based access control: permissions are resolved from user memberships and organization type.
- Business logic belongs in backend services, not frontend components.
- Sensitive file access goes through controlled metadata and signed URLs.
- All important state changes produce audit events.
- External integrations use adapter interfaces so development can run with mock implementations.

## Backend Structure

```text
apps/api/app/
  api/
    v1/
      routes/
  core/
  db/
  models/
  repositories/
  schemas/
  services/
  workers/
  utils/
```

Responsibilities:

- `api/v1/routes`: FastAPI routers and HTTP boundary concerns.
- `core`: settings, logging, security, errors, and shared dependencies.
- `db`: SQLAlchemy engine, session management, base metadata, and migration integration.
- `models`: SQLAlchemy ORM models.
- `repositories`: database access abstractions for complex queries.
- `schemas`: Pydantic request and response schemas.
- `services`: business workflows for onboarding, documents, verification, trust scoring, billing, notifications, and audit.
- `workers`: Celery app and scheduled tasks.
- `utils`: small reusable helpers.

## Frontend Structure

```text
apps/web/
  app/
  components/
  features/
  lib/
  hooks/
  types/
  styles/
```

Responsibilities:

- `app`: App Router pages, layouts, route groups, loading states, and error states.
- `components`: shared UI primitives and layout pieces.
- `features`: domain-specific workflows for vendor, buyer, admin, auth, and billing.
- `lib`: API clients, validation helpers, query keys, auth helpers, and formatting.
- `hooks`: reusable React hooks.
- `types`: shared TypeScript domain types.
- `styles`: Tailwind globals and design tokens.

## API Groups

All backend APIs are versioned under `/api/v1`.

- `/api/v1/auth`: current user, invite acceptance, membership context.
- `/api/v1/orgs`: organization profile, settings, members.
- `/api/v1/vendors`: onboarding, vendor profile, public trust profile.
- `/api/v1/buyers`: buyer profile, search, shortlists, requests.
- `/api/v1/documents`: document metadata, uploads, signed URLs, review state.
- `/api/v1/verification`: verification requests, checks, decisions, trust scoring.
- `/api/v1/admin`: review queue, checklist rules, badges, org management.
- `/api/v1/notifications`: notification list and read state.
- `/api/v1/billing`: subscriptions, plans, payment records, webhook entrypoints.
- `/api/v1/metrics`: admin metrics and health indicators.

## Auth And RBAC

Supabase Auth is the identity provider for real production. With
`AUTH_MODE=supabase_jwt`, the backend validates the bearer token with Supabase
Auth, maps the Supabase subject to `users.auth_subject_id`, and derives roles
from active `memberships`. Local development and the public seeded proof
environment can explicitly use `AUTH_MODE=development_headers`, which trusts
deterministic headers for repeatable tests and must not be used for real
customer production.

Access rules:

- Vendor routes require active membership in a vendor organization.
- Buyer routes require active membership in a buyer organization.
- Admin routes require active admin or super admin membership in an internal organization.
- Super admin routes require `super_admin`.
- Cross-organization buyer/vendor interactions must flow through explicit tables such as `shortlists` and `buyer_vendor_requests`.

## Data Flow

### Vendor Submission

1. Web app saves onboarding progress through vendor APIs.
2. Documents are uploaded through controlled upload endpoints.
3. File metadata is stored in PostgreSQL and file bytes go to the storage adapter.
4. Vendor submits verification request.
5. Backend validates required checklist progress and sets status to `submitted`.
6. Notification service alerts admins.
7. Audit event records the submission.

### Admin Verification

1. Admin opens review queue.
2. Backend returns submitted and under-review requests scoped to admin permissions.
3. Admin reviews documents and verification checks.
4. Trust scoring service recalculates score and stores score evidence.
5. Admin approves, rejects, or requests changes.
6. Badge service assigns or revokes badges.
7. Notification and audit services record outcomes.

### Buyer Search

1. Buyer submits filters from dashboard.
2. API queries buyer-safe vendor data only.
3. Buyer opens a trust profile projection.
4. Buyer shortlists vendor or creates a request.
5. Vendor receives notification and responds through vendor workflow.

## Storage Architecture

The storage service exposes:

- `put_object`
- `get_signed_download_url`
- `get_signed_preview_url`
- `delete_object`

Development uses local storage. Production uses S3-compatible storage. The database stores storage provider, bucket, object key, mime type, file size, checksum, and lifecycle status.

## Billing Architecture

Billing is adapter-driven:

- `MockBillingAdapter` for local development.
- `StripeBillingAdapter` for Stripe readiness.
- `RazorpayBillingAdapter` for Razorpay readiness.

Plan state is stored in `subscriptions`. Payment attempts and one-time verification packs are stored in `payment_records`. Webhook endpoints normalize provider events and update local state through billing services.

## Notifications And Workers

Celery and Redis support:

- Document expiry reminders.
- Pending review reminders.
- Buyer request notifications.
- Weekly digest emails.
- Badge expiry and renewal alerts.
- Optional async audit/event fan-out.

Email delivery uses an adapter with mock, Resend, and Postmark-ready implementations.

## Observability

- Structured JSON logs in the API and worker.
- Request IDs in API logs.
- Audit events for business-critical state changes.
- Optional Sentry hooks through environment settings.
- Health, readiness, and liveness endpoints for deployment checks.

## Deployment Shape

The MVP can run locally with Docker Compose:

- `web`
- `api`
- `worker`
- `postgres`
- `redis`

Production deployment can split the same components across managed services:

- Web on Vercel or container platform.
- API and worker on container platform.
- PostgreSQL on managed database.
- Redis on managed cache/queue service.
- S3-compatible object storage.
- Supabase Auth project.
