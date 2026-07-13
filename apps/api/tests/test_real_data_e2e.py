from __future__ import annotations

import os
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text

from app.db.base import Base
from app.db.seed import seed
from app.db.session import SessionLocal, engine
from app.main import create_app
from app.models.document import DocumentType
from app.models.identity import User
from app.models.organization import Organization

pytestmark = pytest.mark.skipif(
    os.getenv("TRUSTPASS_REAL_DB_TESTS") != "1",
    reason="set TRUSTPASS_REAL_DB_TESTS=1 to run PostgreSQL-backed real data E2E checks",
)


def _headers(*, user_id: UUID, organization_id: UUID, auth_subject_id: str, roles: str) -> dict[str, str]:
    return {
        "authorization": f"Bearer {auth_subject_id}",
        "x-trustpass-user-id": str(user_id),
        "x-trustpass-organization-id": str(organization_id),
        "x-trustpass-roles": roles,
    }


def _get_org(db, slug: str) -> Organization:
    return db.execute(select(Organization).where(Organization.slug == slug)).scalar_one()


def _get_user(db, auth_subject_id: str) -> User:
    return db.execute(select(User).where(User.auth_subject_id == auth_subject_id)).scalar_one()


def test_real_data_workflow_persists_and_logs() -> None:
    with engine.begin() as connection:
        connection.execute(text('CREATE EXTENSION IF NOT EXISTS "pgcrypto"'))
        connection.execute(text('CREATE EXTENSION IF NOT EXISTS "citext"'))
        Base.metadata.create_all(bind=connection)

    with SessionLocal() as db:
        seed(db)
        buyer_org = _get_org(db, "brightline-procurement")
        atlas_org = _get_org(db, "atlas-freight-partners")
        clearpath_org = _get_org(db, "clearpath-advisory")
        internal_org = _get_org(db, "trustpass-ops")
        buyer_user = _get_user(db, "seed-buyer-1")
        clearpath_user = _get_user(db, "seed-vendor-3")
        admin_user = _get_user(db, "seed-admin-2")
        document_type = db.execute(
            select(DocumentType).where(DocumentType.code == "category_compliance")
        ).scalar_one()

    client = TestClient(create_app())
    buyer_headers = _headers(
        user_id=buyer_user.id,
        organization_id=buyer_org.id,
        auth_subject_id=buyer_user.auth_subject_id,
        roles="buyer",
    )
    vendor_headers = _headers(
        user_id=clearpath_user.id,
        organization_id=clearpath_org.id,
        auth_subject_id=clearpath_user.auth_subject_id,
        roles="vendor",
    )
    admin_headers = _headers(
        user_id=admin_user.id,
        organization_id=internal_org.id,
        auth_subject_id=admin_user.auth_subject_id,
        roles="super_admin",
    )

    onboarding_response = client.post(
        "/api/v1/orgs/",
        json={
            "name": f"E2E Buyer {uuid4().hex[:8]}",
            "type": "buyer",
            "email": f"e2e-{uuid4().hex[:8]}@trustpass.local",
            "full_name": "E2E Buyer Owner",
        },
        headers={"authorization": "Bearer real-data-onboarding-subject"},
    )
    assert onboarding_response.status_code == 201
    onboarding_user_id = onboarding_response.json()["data"]["user"]["id"]
    onboarding_org_id = onboarding_response.json()["data"]["organization"]["id"]
    memberships_response = client.get(
        "/api/v1/orgs/memberships",
        headers={
            "authorization": "Bearer real-data-onboarding-subject",
            "x-trustpass-user-id": onboarding_user_id,
            "x-trustpass-organization-id": onboarding_org_id,
            "x-trustpass-roles": "buyer",
        },
    )
    assert memberships_response.status_code == 200
    assert memberships_response.json()["data"]["memberships"][0]["organization_id"] == onboarding_org_id

    health_response = client.get("/api/v1/health")
    assert health_response.status_code == 200
    assert health_response.headers["x-request-id"]

    search_response = client.get("/api/v1/buyers/search", params={"q": "Atlas"}, headers=buyer_headers)
    assert search_response.status_code == 200
    vendors = search_response.json()["data"]["vendors"]
    assert [vendor["organization_id"] for vendor in vendors] == [str(atlas_org.id)]
    assert "private_review_notes" not in vendors[0]

    shortlist_response = client.post(
        "/api/v1/buyers/shortlists",
        json={
            "vendor_organization_id": str(clearpath_org.id),
            "notes": "Real-data E2E shortlist through production API",
        },
        headers=buyer_headers,
    )
    assert shortlist_response.status_code == 200
    assert shortlist_response.json()["data"]["status"] == "active"

    buyer_request_response = client.post(
        "/api/v1/buyers/requests",
        json={
            "vendor_organization_id": str(atlas_org.id),
            "subject": "Real-data E2E insurance summary",
            "message": "Please share the current buyer-safe insurance summary.",
        },
        headers=buyer_headers,
    )
    assert buyer_request_response.status_code == 200
    assert buyer_request_response.json()["data"]["status"] == "open"

    document_response = client.post(
        "/api/v1/documents/",
        json={
            "document_type_id": str(document_type.id),
            "file_name": "clearpath-real-data-e2e.pdf",
            "storage_object_key": f"real-data-e2e/{uuid4()}.pdf",
            "mime_type": "application/pdf",
            "file_size_bytes": 2048,
            "checksum_sha256": "a" * 64,
        },
        headers=vendor_headers,
    )
    assert document_response.status_code == 200
    document_id = document_response.json()["data"]["id"]
    assert document_response.json()["data"]["status"] == "uploaded"

    review_response = client.patch(
        f"/api/v1/documents/{document_id}/review",
        json={"status": "approved", "rejection_notes": None},
        headers=admin_headers,
    )
    assert review_response.status_code == 200
    assert review_response.json()["data"]["status"] == "approved"

    submit_response = client.post("/api/v1/vendors/submit", headers=vendor_headers)
    assert submit_response.status_code == 200
    verification_request_id = submit_response.json()["data"]["id"]
    assert submit_response.json()["data"]["status"] == "submitted"

    decision_response = client.patch(
        f"/api/v1/verification/requests/{verification_request_id}/decision",
        json={
            "status": "approved",
            "vendor_message": "Approved through the real-data E2E workflow.",
            "admin_notes": "Real-data E2E verification decision.",
        },
        headers=admin_headers,
    )
    assert decision_response.status_code == 200
    assert decision_response.json()["data"]["status"] == "approved"

    upload_response = client.post(
        "/api/v1/documents/upload",
        data={"document_type_id": str(document_type.id), "expires_at": "2027-01-31"},
        files={"file": ("clearpath-upload-e2e.pdf", b"real uploaded bytes", "application/pdf")},
        headers=vendor_headers,
    )
    assert upload_response.status_code == 201
    uploaded_document_id = upload_response.json()["data"]["id"]
    assert upload_response.json()["data"]["checksum_sha256"]

    download_response = client.get(
        f"/api/v1/documents/{uploaded_document_id}/download",
        headers=vendor_headers,
    )
    assert download_response.status_code == 200
    assert download_response.json()["data"]["signed_url"].startswith("local://")

    checkout_response = client.post(
        "/api/v1/billing/checkout",
        json={"plan_code": "vendor_growth"},
        headers=vendor_headers,
    )
    assert checkout_response.status_code == 201
    checkout = checkout_response.json()["data"]
    assert checkout["status"] == "pending"

    webhook_response = client.post(
        "/api/v1/billing/webhooks/mock",
        json={
            "event_id": f"real-data-e2e-{uuid4().hex}",
            "organization_id": str(clearpath_org.id),
            "payment_type": "subscription",
            "status": "succeeded",
            "amount_cents": 7900,
            "currency": "USD",
            "provider_payment_id": f"{checkout['external_id']}:payment",
            "subscription_id": checkout["subscription_id"],
            "subscription_status": "active",
        },
    )
    assert webhook_response.status_code == 200
    assert webhook_response.json()["data"]["status"] == "succeeded"

    subscription_response = client.get("/api/v1/billing/subscription", headers=vendor_headers)
    assert subscription_response.status_code == 200
    assert subscription_response.json()["data"]["subscription"]["status"] == "active"

    notifications_response = client.get("/api/v1/notifications/", headers=vendor_headers)
    assert notifications_response.status_code == 200
    notifications = notifications_response.json()["data"]["notifications"]
    assert notifications
    notification_id = notifications[0]["id"]
    read_response = client.post(
        f"/api/v1/notifications/{notification_id}/read",
        headers=vendor_headers,
    )
    assert read_response.status_code == 200
    assert read_response.json()["data"]["status"] == "read"

    audit_response = client.get(
        "/api/v1/audit/events",
        params={"organization_id": str(clearpath_org.id)},
        headers=admin_headers,
    )
    assert audit_response.status_code == 200
    audit_actions = {event["action"] for event in audit_response.json()["data"]["events"]}
    assert {"upload", "review", "submit", "approve"}.issubset(audit_actions)

    activity_response = client.get(
        "/api/v1/audit/activity",
        params={"organization_id": str(clearpath_org.id)},
        headers=admin_headers,
    )
    assert activity_response.status_code == 200
    activity_actions = {event["action"] for event in activity_response.json()["data"]["activity"]}
    assert {"upload_document", "submit_verification", "decide_verification"}.issubset(
        activity_actions
    )
