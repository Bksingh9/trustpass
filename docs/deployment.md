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

## Database

Run migrations:

```bash
cd apps/api
alembic upgrade head
```

Seed demo data:

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

## Current Public Demo

The public demo is served by GitHub Pages from the `gh-pages` branch:

- URL: `https://bksingh9.github.io/trustpass/`
- Source: `apps/web/scripts/build-pages.mjs`
- CI/deploy workflow: `.github/workflows/pages.yml`
- Browser behavior: single-page app fallback via matching `index.html` and `404.html`

GitHub Pages is static hosting, so it does not run the FastAPI backend. The repository keeps the backend end-to-end proof under `/api/v1/demo/*` for local, container, and CI verification until a real API host is attached.

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
