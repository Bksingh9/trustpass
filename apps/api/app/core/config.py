from __future__ import annotations

from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "TRUSTPASS API"
    environment: str = "local"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://trustpass:trustpass@localhost:5432/trustpass"
    redis_url: str = "redis://localhost:6379/0"
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://localhost:4173",
            "http://127.0.0.1:4173",
            "http://localhost:4174",
            "http://127.0.0.1:4174",
            "https://bksingh9.github.io",
        ]
    )

    supabase_project_url: str | None = None
    supabase_publishable_key: str | None = None
    supabase_jwt_audience: str = "authenticated"
    supabase_jwt_issuer: str | None = None
    auth_mode: str = "auto"

    storage_provider: str = "local"
    local_storage_root: str = "./.data/uploads"
    s3_bucket: str | None = None
    s3_region: str | None = None
    s3_endpoint_url: str | None = None

    billing_provider: str = "mock"
    email_provider: str = "mock"
    sentry_dsn: str | None = None
    log_level: str = "INFO"
    enable_demo_routes: bool = True
    allow_synthetic_proof_data: bool = False
    seed_context_token: str | None = None

    @field_validator("database_url")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+psycopg://", 1)
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+psycopg://", 1)
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
