from __future__ import annotations

from fastapi import APIRouter

from app.core.config import get_settings
from app.api.v1.routes import (
    admin,
    audit,
    auth,
    billing,
    buyers,
    demo,
    documents,
    health,
    metrics,
    notifications,
    orgs,
    vendors,
    verification,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(orgs.router, prefix="/orgs", tags=["orgs"])
api_router.include_router(vendors.router, prefix="/vendors", tags=["vendors"])
api_router.include_router(buyers.router, prefix="/buyers", tags=["buyers"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(verification.router, prefix="/verification", tags=["verification"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(billing.router, prefix="/billing", tags=["billing"])
api_router.include_router(metrics.router, prefix="/metrics", tags=["metrics"])

if get_settings().enable_demo_routes:
    api_router.include_router(demo.router, prefix="/demo", tags=["demo"])
