from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import create_app


def test_demo_workflow_end_to_end() -> None:
    client = TestClient(create_app())

    reset_response = client.post("/api/v1/demo/reset")
    assert reset_response.status_code == 200
    reset_data = reset_response.json()["data"]
    assert len(reset_data["vendors"]) == 3
    assert reset_data["shortlists"] == []
    assert reset_data["buyer_requests"] == []

    renewal_response = client.post("/api/v1/demo/vendor/renewal")
    assert renewal_response.status_code == 200
    renewal_data = renewal_response.json()["data"]
    assert renewal_data["renewal_submitted"] is True
    assert {
        "id": "doc-insurance-certificate",
        "name": "Insurance certificate",
        "status": "submitted",
        "expiry": "2027-08-15",
    } in renewal_data["documents"]

    search_response = client.get("/api/v1/demo/buyers/search", params={"q": "Atlas"})
    assert search_response.status_code == 200
    vendors = search_response.json()["data"]["vendors"]
    assert [vendor["name"] for vendor in vendors] == ["Atlas Freight Partners"]
    assert "private_review_notes" not in vendors[0]

    shortlist_response = client.post(
        "/api/v1/demo/buyers/shortlists",
        json={"vendor_id": "atlas-freight-partners", "notes": "Strong logistics fit"},
    )
    assert shortlist_response.status_code == 200
    assert shortlist_response.json()["data"]["status"] == "active"

    buyer_request_response = client.post(
        "/api/v1/demo/buyers/requests",
        json={
            "vendor_id": "atlas-freight-partners",
            "subject": "Need insurance summary",
            "message": "Please share a buyer-safe insurance and renewal summary.",
        },
    )
    assert buyer_request_response.status_code == 200
    assert buyer_request_response.json()["data"]["status"] == "open"

    review_response = client.patch("/api/v1/demo/admin/reviews/vr-1007/approve")
    assert review_response.status_code == 200
    approved_review = review_response.json()["data"]
    assert approved_review["status"] == "approved"
    assert approved_review["risk"] == "low"
    assert all(check["status"] == "passed" for check in approved_review["weighted_checks"])

    contact_response = client.post(
        "/api/v1/demo/contact/demo-requests",
        json={
            "name": "Priya Shah",
            "email": "priya@example.com",
            "organization": "Acme Procurement",
            "plan": "Vendor Growth",
            "message": "We want to verify vendors and manage renewal documents.",
        },
    )
    assert contact_response.status_code == 200
    assert contact_response.json()["data"]["status"] == "received"

    state_response = client.get("/api/v1/demo/state")
    assert state_response.status_code == 200
    final_state = state_response.json()["data"]
    assert len(final_state["shortlists"]) == 1
    assert len(final_state["buyer_requests"]) == 1
    assert len(final_state["demo_requests"]) == 1
    assert any(event["action"] == "approve" for event in final_state["audit_events"])
