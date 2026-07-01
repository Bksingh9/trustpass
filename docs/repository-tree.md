# Repository Tree

```text
trustpass/
  README.md
  Makefile
  docker-compose.yml
  docs/
    PRD.md
    architecture.md
    schema.md
    api-spec.md
    trust-scoring.md
    billing.md
    onboarding-workflows.md
    deployment.md
    qa-checklist.md
    monetization.md
    repository-tree.md
  apps/
    api/
      app/
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
      alembic/
        versions/
      tests/
      Dockerfile
      pyproject.toml
      alembic.ini
      .env.example
    web/
      app/
      components/
      features/
      hooks/
      lib/
      styles/
      types/
      Dockerfile
      package.json
      .env.example
  infra/
  scripts/
```

This tree keeps the MVP modular while staying lean enough for a small founding team. The backend owns durable business logic, tenant isolation, workflow rules, audit logging, and integrations. The frontend owns product workflows, dashboard ergonomics, and buyer-safe presentation.

