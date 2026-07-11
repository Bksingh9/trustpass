# Deployment

## Local Deployment

Use Docker Compose from the repository root:

```bash
docker compose up --build
```

Services:

- Web: `http://localhost:3000`
- API docs: `http://localhost:8000/api/v1/docs`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

## Environment

Copy environment examples before running outside Compose:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

For production API deployments, set:

```bash
ENVIRONMENT=production
ENABLE_DEMO_ROUTES=false
AUTH_MODE=supabase_jwt
SUPABASE_PROJECT_URL=https://<project-id>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<publishable key>
SEED_CONTEXT_TOKEN=<shared deployed-proof secret>
```

That keeps `/api/v1/demo/*` out of the public API while preserving the local and CI demo contract when explicitly enabled.
`AUTH_MODE=auto` resolves to `supabase_jwt` when `ENVIRONMENT=production` and
to `development_headers` elsewhere. The public Render demo/proof service sets
`AUTH_MODE=development_headers` explicitly because its seeded E2E workflows use
deterministic non-customer users. Do not use development-header mode for real
customer production.
`SEED_CONTEXT_TOKEN` protects the seeded proof-context helper in production. Set
the same value as the GitHub Actions secret `TRUSTPASS_SEED_CONTEXT_TOKEN` when
running deployed end-to-end proof workflows. Leave it unset to disable that
helper in production.

## Database

Run migrations:

```bash
cd apps/api
alembic upgrade head
```

Seed local development records:

```bash
python -m app.db.seed
```

With Docker Compose:

```bash
make api-migrate
make api-seed
```

## Production Shape

- Web: Vercel, Render, or containerized Next.js.
- API: Render/container service.
- Worker: separate Celery worker container when async jobs are needed.
- Database: managed PostgreSQL.
- Queue: managed Redis.
- Storage: S3-compatible object storage.
- Auth: Supabase project.
- Email: Resend or Postmark.
- Billing: Stripe and/or Razorpay.

## No-Cloudflare Live Plan

Cloudflare is not required for TRUSTPASS. The required live components are a
public HTTPS API and a durable database. The preferred no-Cloudflare path is:

- API host: Render web service from `apps/api/Dockerfile` on the explicit `free`
  instance plan.
- Database: Render managed PostgreSQL from `render.yaml` on the explicit `free`
  database plan.
- Demo routes: disabled with `ENABLE_DEMO_ROUTES=false`.
- Auth mode: the public demo/proof host uses `AUTH_MODE=development_headers` by
  design for deterministic seed users. A real customer production host should
  remove that override and configure `AUTH_MODE=supabase_jwt`,
  `SUPABASE_PROJECT_URL`, and `SUPABASE_PUBLISHABLE_KEY`.
- Bootstrap: `TRUSTPASS_SEED_ON_START=true` runs migrations plus realistic
  verification seed records so the deployed E2E can authenticate deterministic
  buyer, vendor, and admin contexts, then create fresh live records.
- Seed context helper: `SEED_CONTEXT_TOKEN` must be set in Render and mirrored
  as GitHub secret `TRUSTPASS_SEED_CONTEXT_TOKEN` before deployed proof
  workflows can resolve deterministic seed IDs. This token is not a user auth
  token; it only gates the proof helper.
- Verification: `.github/workflows/verify-deployed-api.yml` targets
  `https://trustpass-api.onrender.com` by default. Set repository variable
  `TRUSTPASS_API_BASE_URL` only when replacing that Render URL.

This proof uses production routes, not `/api/v1/demo/*`, and verifies
health/readiness, buyer-safe search, shortlist persistence, buyer request
persistence, document upload/review, verification decision, audit events,
activity logs, and request IDs.

## Current Public Gateway

The public gateway is served by GitHub Pages from the `gh-pages` branch:

- URL: `https://bksingh9.github.io/trustpass/`
- Source: `apps/web/scripts/build-pages.mjs`
- CI/deploy workflow: `.github/workflows/pages.yml`
- Browser behavior: single-page app fallback via matching `index.html` and `404.html`

GitHub Pages is static hosting, so it does not run the API or write to a
database. It is a static public gateway connected to the separate no-Cloudflare
Render/FastAPI/PostgreSQL API. The same-origin Pages path
`https://bksingh9.github.io/trustpass/api/health` should remain a static
fallback/404. The real live API is `https://trustpass-api.onrender.com/api/v1`
unless `TRUSTPASS_API_BASE_URL` or `TRUSTPASS_LIVE_BASE_URL` points the gateway
to a replacement host.

The currently deployed public environment is a production runtime with
synthetic seed, QA, and proof records. It is not customer data. The live gateway
state response includes:

```json
{
  "meta": {
    "data_classification": "synthetic_seed_and_qa",
    "contains_customer_data": false
  }
}
```

Treat `mixed_or_unknown` as a launch review blocker for public demos unless the
environment has intentionally been moved to real customer onboarding data.

If the optional Cloudflare Worker path is used, Pages can point at the deployed
Worker/D1 API through `TRUSTPASS_LIVE_BASE_URL`. After that connection exists,
the public gateway writes through the Worker API; the public gateway proof
creates and re-reads live vendor, buyer, document, buyer request, verification
decision, log, audit, score snapshot, and notification records.
The same-origin Pages path `https://bksingh9.github.io/trustpass/api/health`
must remain a static `404`; the real live API is the separate Cloudflare Worker
URL verified by `.github/workflows/live-app.yml` and
`.github/workflows/deploy-live-worker.yml`. The live Worker also exposes
`/api/operational-proof` for D1 counts, recent request logs, audit events, score
snapshots, and notifications.

## Real-Data API Verification

The API has a PostgreSQL-backed E2E path that uses production routes instead of demo routes. It verifies:

- request-level JSON logs with `x-request-id`
- buyer-safe vendor search through `/api/v1/buyers/search`
- shortlist and buyer request persistence
- document metadata persistence and admin review
- vendor verification submission and admin decision
- audit event and activity log retrieval through `/api/v1/audit/events` and `/api/v1/audit/activity`

GitHub Actions runs this in the `Real-data API E2E` job with a PostgreSQL service, migrations, seed records, and `TRUSTPASS_REAL_DB_TESTS=1`.
For a deployed API host, `.github/workflows/verify-deployed-api.yml` runs
`apps/api/scripts/e2e_deployed_real_api.py` against `TRUSTPASS_API_BASE_URL` and
uploads `trustpass-deployed-api-proof`.

Local command when PostgreSQL is running:

```bash
cd apps/api
alembic upgrade head
python -m app.db.seed
set TRUSTPASS_REAL_DB_TESTS=1
pytest tests/test_real_data_e2e.py
```

This is the current no-demo API proof. The public GitHub Pages site can only use it end-to-end after FastAPI is deployed to a public HTTPS API host and the web app is configured with that API base URL.

## Local API-Backed Web Demo

Start the API:

```bash
cd apps/api
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Build and serve the static app:

```bash
cd apps/web
npm run build:pages
PORT=4174 npm run serve:pages
```

Open the static app with an API base URL:

```text
http://127.0.0.1:4174/?api=http%3A%2F%2F127.0.0.1%3A8000%2Fapi%2Fv1#/
```

In API-backed mode, browser actions call FastAPI demo endpoints for reset, vendor renewal, buyer shortlist, buyer request, admin approval, and contact/demo request. Without the `api` query parameter, the same static app remains a standalone public demo.

The API default CORS allowlist includes:

- `http://localhost:3000`
- `http://localhost:4173`
- `http://127.0.0.1:4173`
- `http://localhost:4174`
- `http://127.0.0.1:4174`
- `https://bksingh9.github.io`

## End-to-End Verification

GitHub Actions runs `.github/workflows/ci.yml` on pushes and pull requests:

- API tests install `apps/api` and run `pytest`, including `tests/test_demo_e2e.py`.
- Real-data API E2E starts PostgreSQL, runs migrations and seed records, then verifies production API routes and audit/activity logs.
- Static Pages smoke runs `node apps/web/scripts/e2e-static.mjs`.
- API-backed web smoke starts FastAPI, serves the generated Pages app locally, and runs `node apps/web/scripts/e2e-api-backed.mjs`.

The API demo route verifies the product loop:

1. Reset demo data.
2. Submit vendor renewal evidence.
3. Search buyer-safe vendor profiles.
4. Shortlist a vendor.
5. Request vendor information.
6. Approve an admin review.
7. Submit a contact/demo request.
8. Confirm audit-style events and buyer/private data separation.

## Operational Checks

- `/api/v1/health` for service status.
- `/api/v1/readiness` for database readiness.
- `/api/v1/demo/health` for the no-database demo workflow contract.
- Structured logs for API and worker.
- Audit events for business-critical state changes.
