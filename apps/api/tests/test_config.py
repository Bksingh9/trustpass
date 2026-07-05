from __future__ import annotations

from app.core.config import Settings


def test_database_url_normalizes_render_postgres_scheme() -> None:
    settings = Settings(database_url="postgres://user:password@example.com:5432/trustpass")

    assert settings.database_url == "postgresql+psycopg://user:password@example.com:5432/trustpass"


def test_database_url_normalizes_plain_postgresql_scheme() -> None:
    settings = Settings(database_url="postgresql://user:password@example.com:5432/trustpass")

    assert settings.database_url == "postgresql+psycopg://user:password@example.com:5432/trustpass"


def test_database_url_keeps_explicit_sqlalchemy_driver() -> None:
    settings = Settings(database_url="postgresql+psycopg://user:password@example.com:5432/trustpass")

    assert settings.database_url == "postgresql+psycopg://user:password@example.com:5432/trustpass"
