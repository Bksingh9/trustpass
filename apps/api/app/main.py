from __future__ import annotations

from time import perf_counter
from uuid import uuid4

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging
from app.core.security import validate_auth_configuration


def create_app() -> FastAPI:
    settings = get_settings()
    validate_auth_configuration(settings)
    configure_logging(settings.log_level)

    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        openapi_url=f"{settings.api_v1_prefix}/openapi.json",
        docs_url=f"{settings.api_v1_prefix}/docs",
        redoc_url=f"{settings.api_v1_prefix}/redoc",
    )

    request_logger = structlog.get_logger("trustpass.requests")

    @app.middleware("http")
    async def request_logging_middleware(request, call_next):
        request_id = request.headers.get("x-request-id", str(uuid4()))
        started_at = perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            duration_ms = round((perf_counter() - started_at) * 1000, 2)
            request_logger.exception(
                "request_failed",
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                actor_user_id=request.headers.get("x-trustpass-user-id"),
                organization_id=request.headers.get("x-trustpass-organization-id"),
                duration_ms=duration_ms,
            )
            raise

        duration_ms = round((perf_counter() - started_at) * 1000, 2)
        response.headers["x-request-id"] = request_id
        request_logger.info(
            "request_completed",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            actor_user_id=request.headers.get("x-trustpass-user-id"),
            organization_id=request.headers.get("x-trustpass-organization-id"),
            duration_ms=duration_ms,
        )
        return response

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["x-request-id"],
    )

    register_exception_handlers(app)
    app.include_router(api_router, prefix=settings.api_v1_prefix)
    return app


app = create_app()
