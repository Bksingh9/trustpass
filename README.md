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
