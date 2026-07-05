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
```

That keeps `/api/v1/demo/*` out of the public API while preserving the local and CI demo contract when explicitly enabled.

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

- Web: Vercel or containerized Next.js.
- API: container service.
- Worker: separate Celery worker container.
- Database: managed PostgreSQL.
- Queue: managed Redis.
- Storage: S3-compatible object storage.
- Auth: Supabase project.
- Email: Resend or Postmark.
- Billing: Stripe and/or Razorpay.

## Current Public Gateway

The public gateway is served by GitHub Pages from the `gh-pages` branch:

- URL: `https://bksingh9.github.io/trustpass/`
- Source: `apps/web/scripts/build-pages.mjs`
- CI/deploy workflow: `.github/workflows/pages.yml`
- Browser behavior: single-page app fallback via matching `index.html` and `404.html`

GitHub Pages is static hosting, so it does not run the API or write to a
database. It must point at the deployed Worker/D1 API through
`TRUSTPASS_LIVE_BASE_URL` before it counts as a live real-data surface.
The same-origin Pages path `https://bksingh9.github.io/trustpass/api/health`
must remain a static `404`; the real live API is the separate Cloudflare Worker
URL verified by `.github/workflows/live-app.yml` and
`.github/workflows/deploy-live-worker.yml`.

## Real-Data API Verification

The API has a PostgreSQL-backed E2E path that uses production routes instead of demo routes. It verifies:

- request-level JSON logs with `x-request-id`
- buyer-safe vendor search through `/api/v1/buyers/search`
- shortlist and buyer request persistence
- document metadata persistence and admin review
- vendor verification submission and admin decision
- audit event and activity log retrieval through `/api/v1/audit/events` and `/api/v1/audit/activity`

GitHub Actions runs this in the `Real-data API E2E` job with a PostgreSQL service, migrations, seed records, and `TRUSTPASS_REAL_DB_TESTS=1`.

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
