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

## Operational Checks

- `/api/v1/health` for service status.
- `/api/v1/readiness` for database readiness.
- Structured logs for API and worker.
- Audit events for business-critical state changes.
