#!/bin/sh
set -e

python -m alembic upgrade head

if [ "${TRUSTPASS_SEED_ON_START:-false}" = "true" ]; then
  python -m app.db.seed
fi

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
