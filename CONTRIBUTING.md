# Contributing to TRUSTPASS

Thanks for helping improve TRUSTPASS.

## Development Setup

Start the local stack from the repository root:

```bash
docker compose up --build
make api-migrate
make api-seed
```

Run backend tests:

```bash
cd apps/api
pytest
```

Run the static public-gateway smoke test:

```bash
cd apps/web
node scripts/e2e-static.mjs
```

## Data Rules

- Use dummy data only in tests, docs, screenshots, and public demos.
- Do not commit secrets, API keys, Supabase tokens, database URLs, or customer
  data.
- Public demo records must remain clearly synthetic. The live gateway should
  report `meta.data_classification` before anyone treats the data as safe for a
  public demo.

## Pull Request Expectations

- Keep changes scoped and explain the product/security effect.
- Add or update tests for behavior changes.
- Run the relevant local checks before requesting review.
- Include migration notes when changing database shape or seed data.
- Preserve buyer-safe projections: public/buyer views must not expose private
  document object keys, reviewer notes, or admin-only evidence.

## Security-Sensitive Changes

For auth, tenancy, billing, document access, or audit changes, include:

- threat boundary changed
- privileged roles affected
- tenant-owned tables touched
- tests or proof covering unauthorized access
- rollout and rollback notes
