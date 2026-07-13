# TRUSTPASS

[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/Bksingh9/trustpass/badge)](https://scorecard.dev/viewer/?uri=github.com/Bksingh9/trustpass)

TRUSTPASS is a B2B vendor trust, verification, and onboarding platform. It helps vendors become procurement-ready and helps buyers discover, evaluate, shortlist, and onboard verified vendors faster.

## Live Status

- Public site: `https://bksingh9.github.io/trustpass/`
- Live API: `https://trustpass-api.onrender.com/api/v1`
- Current live data boundary: the deployed API uses a real production runtime and PostgreSQL database, but the visible organizations are synthetic seed, QA, and proof records. `GET /api/v1/api/trustpass` returns `meta.data_classification`; the expected public demo value is `synthetic_seed_and_qa` with `contains_customer_data: false`.
- GitHub Pages is static hosting. The same-origin Pages URL `https://bksingh9.github.io/trustpass/api/health` should remain a static fallback/404; live API calls go to the separate Render/FastAPI host.

## Open Source and Security

- License: Apache-2.0.
- Vulnerability reporting: see `SECURITY.md`.
- Community conduct: see `CODE_OF_CONDUCT.md`.
- Contribution workflow: see `CONTRIBUTING.md`.
- Public launch checks should include tests, CodeQL code scanning, OpenSSF Scorecard, the deployed API proof, the public gateway proof, CodeRabbit review when authenticated, and security hardening review for auth, tenancy, audit, and data-classification boundaries.
- The optional `/admin/seed-context` helper requires `SEED_CONTEXT_TOKEN` on the API host and matching GitHub secret `TRUSTPASS_SEED_CONTEXT_TOKEN`; leaving it unset disables the helper in production. The deployed E2E proof computes deterministic seed IDs locally and does not require this helper.
- Auth boundary: `AUTH_MODE=auto` uses development headers locally and Supabase JWT verification in production. The public demo/proof Render service explicitly sets `AUTH_MODE=development_headers`; real customer production should use `AUTH_MODE=supabase_jwt` with `SUPABASE_PROJECT_URL` and `SUPABASE_PUBLISHABLE_KEY`.

This repository is structured as a production-oriented MVP:

- `apps/api`: FastAPI backend with SQLAlchemy, Alembic, Celery, and PostgreSQL.
- `apps/web`: Next.js 14 web app with TypeScript, Tailwind, TanStack Query, React Hook Form, and Zod.
- `docs`: Product, architecture, schema, workflow, billing, deployment, and QA documentation.
- `infra`: Local and deployment-oriented infrastructure assets.
- `scripts`: Development and seed helpers.

## MVP Outcomes

- Vendors create a trust profile and upload business/compliance documents.
- Admin reviewers verify documents, score vendors, and assign trust badges.
- Buyers search verified vendors, view buyer-safe trust summaries, shortlist vendors, and request more information.
- Billing, notifications, audit logs, and background jobs are designed as real extension points from day one.

## Local Development Target

The intended local stack is:

- Web: Next.js 14 on port 3000.
- API: FastAPI on port 8000.
- Database: PostgreSQL.
- Queue/cache: Redis.
- Worker: Celery.

Docker, seed data, tests, and setup commands will be filled in as the build order progresses.

## Current Local Commands

```bash
docker compose up --build
make api-migrate
make api-seed
```

The first backend test target is available at `apps/api/tests/test_health.py`.

## End-to-End Proof

TRUSTPASS now has two supported operating modes:

- Public demo: GitHub Pages serves the static TRUSTPASS workflow at `https://bksingh9.github.io/trustpass/`.
- Full-stack proof: the FastAPI app exposes `/api/v1/demo/*` workflow endpoints that cover vendor renewal, buyer search, shortlisting, buyer requests, admin approval, contact/demo requests, audit-style events, and buyer-safe trust-profile exposure.
- Real-data API proof: GitHub Actions runs a PostgreSQL-backed E2E check against production API routes, database persistence, request IDs, audit events, and activity logs. This path intentionally avoids `/api/v1/demo/*`.
- Render/FastAPI live path: `render.yaml` deploys the production API with managed PostgreSQL on explicit free Render plans, disables demo routes, runs migrations, optionally bootstraps realistic verification seed records, and is verified by `.github/workflows/verify-deployed-api.yml` against `https://trustpass-api.onrender.com` unless `TRUSTPASS_API_BASE_URL` overrides it.
- Optional Worker/D1 live proof: `apps/live` contains a D1-backed Worker app with `/api/health`, `/api/readiness`, `/api/trustpass`, `/api/operational-proof`, durable request logs, audit correlation, trust score snapshots, and notifications. The `TRUSTPASS Live App` GitHub Actions workflow runs the same write/read proof locally and only verifies a deployed Worker when `TRUSTPASS_LIVE_BASE_URL` is configured.
- Public live gateway: the GitHub Pages build reads repository variable `TRUSTPASS_LIVE_BASE_URL`, then `TRUSTPASS_API_BASE_URL`, and otherwise defaults to `https://trustpass-api.onrender.com/api/v1`. The gateway exposes live read views and admin-protected write controls for vendors, buyers, documents, buyer requests, and verification decisions. It also displays the API-provided data classification so synthetic seed/QA/proof records are not confused with customer data.
- Worker deployment: the `Deploy TRUSTPASS Live Worker` workflow runs automatically on relevant `main` pushes when Cloudflare secrets are configured. It preflights Cloudflare token/D1 access, resolves an existing D1 database by name or creates it, applies migrations, resolves the deployed Worker URL, runs the deployed E2E proof, saves the live URL as a repo variable when permitted, publishes the public gateway preconnected to that URL, and verifies the public gateway can create and re-read live records through the Worker.
- Manual live verification: the `Verify TRUSTPASS Live URL` workflow reruns the live API and public gateway proofs against a supplied Worker URL without redeploying, including the public gateway live write proof.

Production API deployments should set `ENABLE_DEMO_ROUTES=false` and point the web app at the deployed API host.

Run the backend E2E proof after installing API dependencies:

```bash
cd apps/api
pytest
```

Run the static Pages smoke test:

```bash
cd apps/web
npm run test:static
```

Run the API-backed HTTP smoke test while API and local Pages servers are running:

```bash
cd apps/web
npm run test:api-backed
```

Run the API-backed local demo:

```bash
cd apps/api
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

```bash
cd apps/web
npm run build:pages
PORT=4174 npm run serve:pages
```

Then open:

```text
http://127.0.0.1:4174/?api=http%3A%2F%2F127.0.0.1%3A8000%2Fapi%2Fv1#/
```

GitHub Actions runs API, static Pages, and API-backed web checks on pushes and pull requests.

Run the PostgreSQL-backed real-data check when a database is available:

```bash
cd apps/api
set TRUSTPASS_REAL_DB_TESTS=1
pytest tests/test_real_data_e2e.py
```

The real-data check requires migrated PostgreSQL tables and seed records from `python -m app.db.seed`.

## Production Host Readiness

`render.yaml` defines a managed-Postgres FastAPI deployment path on explicit
free Render plans. The API container runs Alembic migrations before serving,
sets `ENABLE_DEMO_ROUTES=false`, and uses `/api/v1/readiness` as the health
check. Hosted Postgres URLs such as `postgres://...` and `postgresql://...` are
normalized to the installed `postgresql+psycopg://...` SQLAlchemy driver.

The current GitHub Pages URL is a static public gateway, not the API host:
`https://bksingh9.github.io/trustpass/api/health` returns `404` by design.
Treat the live proof as complete only when the separate Render/FastAPI or
Worker host returns health/readiness success, passes the live E2E proof, and
reports an expected data classification.
