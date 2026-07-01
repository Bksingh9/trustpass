.PHONY: dev build down logs api-migrate api-seed api-test web-typecheck

dev:
	docker compose up --build

build:
	docker compose build

down:
	docker compose down

logs:
	docker compose logs -f

api-migrate:
	docker compose run --rm api alembic upgrade head

api-seed:
	docker compose run --rm api python -m app.db.seed

api-test:
	cd apps/api && pytest

web-typecheck:
	cd apps/web && npm run typecheck
