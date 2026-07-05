# TRUSTPASS

TRUSTPASS is a B2B vendor trust, verification, and onboarding platform. It helps vendors become procurement-ready and helps buyers discover, evaluate, shortlist, and onboard verified vendors faster.

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
