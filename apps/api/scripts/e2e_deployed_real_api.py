from __future__ import annotations

import argparse
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from uuid import NAMESPACE_URL, uuid4, uuid5


def normalize_base_url(value: str) -> str:
    base_url = value.rstrip("/")
    if not base_url.endswith("/api/v1"):
        base_url = f"{base_url}/api/v1"
    return base_url


def assert_condition(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def request_json(
    base_url: str,
    method: str,
    path: str,
    *,
    headers: dict[str, str] | None = None,
    payload: dict[str, Any] | None = None,
    query: dict[str, str] | None = None,
    expected_statuses: set[int] | None = None,
    attempts: int = 5,
) -> tuple[int, dict[str, Any], dict[str, str]]:
    expected = expected_statuses or {200}
    url = f"{base_url}{path}"
    if query:
        url = f"{url}?{urlencode(query)}"
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    request_headers = {"accept": "application/json", **(headers or {})}
    if body is not None:
        request_headers["content-type"] = "application/json"
    request = Request(url, data=body, headers=request_headers, method=method)

    response_body = ""
    status = 0
    response_headers: dict[str, str] = {}
    for attempt in range(1, attempts + 1):
        try:
            with urlopen(request, timeout=30) as response:
                response_body = response.read().decode("utf-8")
                status = response.status
                response_headers = {key.lower(): value for key, value in response.headers.items()}
        except HTTPError as error:
            response_body = error.read().decode("utf-8")
            status = error.code
            response_headers = {key.lower(): value for key, value in error.headers.items()}

        if status in expected or attempt == attempts:
            break
        time.sleep(2)

    assert_condition(
        status in expected,
        f"{method} {path} returned {status}; expected {sorted(expected)}. Body: {response_body[:300]}",
    )
    if not response_body:
        return status, {}, response_headers
    return status, json.loads(response_body), response_headers


def context_headers(
    *, auth_subject_id: str, user_id: str, organization_id: str, roles: str, request_id: str
) -> dict[str, str]:
    return {
        "authorization": f"Bearer {auth_subject_id}",
        "x-trustpass-user-id": user_id,
        "x-trustpass-organization-id": organization_id,
        "x-trustpass-roles": roles,
        "x-request-id": request_id,
    }


def assert_request_id(headers: dict[str, str], request_id: str) -> None:
    assert_condition(
        headers.get("x-request-id") == request_id,
        f"missing or mismatched x-request-id for {request_id}",
    )


def stable_seed_id(kind: str, key: str) -> str:
    return str(uuid5(NAMESPACE_URL, f"trustpass:seed:{kind}:{key}"))


def resolve_seed_context() -> dict[str, str]:
    return {
        "buyer_org": stable_seed_id("organization", "brightline-procurement"),
        "atlas_org": stable_seed_id("organization", "atlas-freight-partners"),
        "clearpath_org": stable_seed_id("organization", "clearpath-advisory"),
        "internal_org": stable_seed_id("organization", "trustpass-ops"),
        "buyer_user": stable_seed_id("user", "seed-buyer-1"),
        "clearpath_user": stable_seed_id("user", "seed-vendor-3"),
        "admin_user": stable_seed_id("user", "seed-admin-2"),
        "category_compliance_document_type": stable_seed_id("document_type", "category_compliance"),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Run deployed TRUSTPASS FastAPI real-data E2E proof.")
    parser.add_argument("--base-url", default=os.getenv("TRUSTPASS_API_BASE_URL", ""))
    parser.add_argument("--proof-out", default=os.getenv("TRUSTPASS_API_PROOF_PATH", ""))
    args = parser.parse_args()

    assert_condition(args.base_url, "TRUSTPASS_API_BASE_URL or --base-url is required")
    base_url = normalize_base_url(args.base_url)
    run_id = f"api-live-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid4().hex[:8]}"

    proof: dict[str, Any] = {
        "baseUrl": base_url,
        "runId": run_id,
        "startedAt": datetime.now(timezone.utc).isoformat(),
        "checks": [],
        "requestIds": {},
    }

    _, health, health_headers = request_json(base_url, "GET", "/health")
    assert_condition(health.get("status") == "ok", "health did not return ok")
    proof["requestIds"]["health"] = health_headers.get("x-request-id")
    proof["checks"].append("health")

    _, readiness, readiness_headers = request_json(base_url, "GET", "/readiness")
    assert_condition(readiness.get("status") == "ready", "readiness did not return ready")
    proof["requestIds"]["readiness"] = readiness_headers.get("x-request-id")
    proof["checks"].append("readiness")

    request_json(base_url, "GET", "/demo/health", expected_statuses={404})
    proof["checks"].append("demo_routes_disabled")

    ids = resolve_seed_context()
    proof["checks"].append("deterministic_seed_context")

    buyer_headers = context_headers(
        auth_subject_id="seed-buyer-1",
        user_id=ids["buyer_user"],
        organization_id=ids["buyer_org"],
        roles="buyer",
        request_id=f"{run_id}-buyer",
    )
    vendor_headers = context_headers(
        auth_subject_id="seed-vendor-3",
        user_id=ids["clearpath_user"],
        organization_id=ids["clearpath_org"],
        roles="vendor",
        request_id=f"{run_id}-vendor",
    )
    admin_headers = context_headers(
        auth_subject_id="seed-admin-2",
        user_id=ids["admin_user"],
        organization_id=ids["internal_org"],
        roles="super_admin",
        request_id=f"{run_id}-admin",
    )

    _, search, search_headers = request_json(
        base_url,
        "GET",
        "/buyers/search",
        headers=buyer_headers | {"x-request-id": f"{run_id}-search"},
        query={"q": "Atlas"},
    )
    vendors = search["data"]["vendors"]
    assert_condition(
        vendors and vendors[0]["organization_id"] == ids["atlas_org"],
        "buyer search did not return Atlas",
    )
    assert_condition("private_review_notes" not in vendors[0], "buyer search leaked private review notes")
    assert_request_id(search_headers, f"{run_id}-search")
    proof["checks"].append("buyer_safe_search")

    _, shortlist, shortlist_headers = request_json(
        base_url,
        "POST",
        "/buyers/shortlists",
        headers=buyer_headers | {"x-request-id": f"{run_id}-shortlist"},
        payload={
            "vendor_organization_id": ids["clearpath_org"],
            "notes": f"Deployed real-data E2E shortlist {run_id}",
        },
    )
    assert_condition(shortlist["data"]["status"] == "active", "shortlist was not active")
    assert_request_id(shortlist_headers, f"{run_id}-shortlist")
    proof["checks"].append("shortlist")

    _, buyer_request, buyer_request_headers = request_json(
        base_url,
        "POST",
        "/buyers/requests",
        headers=buyer_headers | {"x-request-id": f"{run_id}-buyer-request"},
        payload={
            "vendor_organization_id": ids["atlas_org"],
            "subject": f"Deployed real-data request {run_id}",
            "message": "Please share the current buyer-safe verification summary.",
        },
    )
    assert_condition(buyer_request["data"]["status"] == "open", "buyer request was not open")
    assert_request_id(buyer_request_headers, f"{run_id}-buyer-request")
    proof["checks"].append("buyer_request")

    _, document, document_headers = request_json(
        base_url,
        "POST",
        "/documents/",
        headers=vendor_headers | {"x-request-id": f"{run_id}-document"},
        payload={
            "document_type_id": ids["category_compliance_document_type"],
            "file_name": f"clearpath-{run_id}.pdf",
            "storage_object_key": f"deployed-real-data/{run_id}.pdf",
            "mime_type": "application/pdf",
            "file_size_bytes": 2048,
            "checksum_sha256": "b" * 64,
        },
    )
    document_id = document["data"]["id"]
    assert_condition(document["data"]["status"] == "uploaded", "document was not uploaded")
    assert_request_id(document_headers, f"{run_id}-document")
    proof["checks"].append("document_upload")

    _, review, review_headers = request_json(
        base_url,
        "PATCH",
        f"/documents/{document_id}/review",
        headers=admin_headers | {"x-request-id": f"{run_id}-review"},
        payload={"status": "approved", "rejection_notes": None},
    )
    assert_condition(review["data"]["status"] == "approved", "document was not approved")
    assert_request_id(review_headers, f"{run_id}-review")
    proof["checks"].append("document_review")

    _, existing_requests, existing_requests_headers = request_json(
        base_url,
        "GET",
        "/verification/requests",
        headers=admin_headers | {"x-request-id": f"{run_id}-existing-requests"},
    )
    assert_request_id(existing_requests_headers, f"{run_id}-existing-requests")
    clearpath_request = next(
        (
            request
            for request in existing_requests["data"]["verification_requests"]
            if request["organization_id"] == ids["clearpath_org"]
        ),
        None,
    )
    needs_decision = True
    if clearpath_request and clearpath_request["status"] in {"submitted", "under_review"}:
        verification_request_id = clearpath_request["id"]
        proof["checks"].append("verification_submit_reused")
    elif clearpath_request and clearpath_request["status"] == "approved":
        verification_request_id = clearpath_request["id"]
        needs_decision = False
        proof["checks"].append("verification_submit_reused")
        proof["checks"].append("verification_decision_reused")
    else:
        _, submit, submit_headers = request_json(
            base_url,
            "POST",
            "/vendors/submit",
            headers=vendor_headers | {"x-request-id": f"{run_id}-submit"},
            payload={},
        )
        verification_request_id = submit["data"]["id"]
        assert_condition(submit["data"]["status"] == "submitted", "verification request was not submitted")
        assert_request_id(submit_headers, f"{run_id}-submit")
        proof["checks"].append("verification_submit")

    if needs_decision:
        _, decision, decision_headers = request_json(
            base_url,
            "PATCH",
            f"/verification/requests/{verification_request_id}/decision",
            headers=admin_headers | {"x-request-id": f"{run_id}-decision"},
            payload={
                "status": "approved",
                "vendor_message": "Approved through deployed real-data E2E.",
                "admin_notes": f"Deployed real-data verification decision {run_id}.",
            },
        )
        assert_condition(
            decision["data"]["status"] == "approved",
            "verification request was not approved",
        )
        assert_request_id(decision_headers, f"{run_id}-decision")
        proof["checks"].append("verification_decision")

    _, audit, audit_headers = request_json(
        base_url,
        "GET",
        "/audit/events",
        headers=admin_headers | {"x-request-id": f"{run_id}-audit"},
        query={"organization_id": ids["clearpath_org"]},
    )
    audit_actions = {event["action"] for event in audit["data"]["events"]}
    assert_condition(
        {"upload", "review", "submit", "approve"}.issubset(audit_actions),
        "audit proof is incomplete",
    )
    assert_request_id(audit_headers, f"{run_id}-audit")
    proof["checks"].append("audit_events")

    _, activity, activity_headers = request_json(
        base_url,
        "GET",
        "/audit/activity",
        headers=admin_headers | {"x-request-id": f"{run_id}-activity"},
        query={"organization_id": ids["clearpath_org"]},
    )
    activity_actions = {event["action"] for event in activity["data"]["activity"]}
    assert_condition(
        {"upload_document", "submit_verification", "decide_verification"}.issubset(activity_actions),
        "activity proof is incomplete",
    )
    assert_request_id(activity_headers, f"{run_id}-activity")
    proof["checks"].append("activity_logs")

    proof["completedAt"] = datetime.now(timezone.utc).isoformat()
    proof["status"] = "passed"
    proof["entities"] = {
        "documentId": document_id,
        "verificationRequestId": verification_request_id,
        "clearpathOrganizationId": ids["clearpath_org"],
    }

    if args.proof_out:
        proof_path = Path(args.proof_out)
        proof_path.parent.mkdir(parents=True, exist_ok=True)
        proof_path.write_text(json.dumps(proof, indent=2) + "\n", encoding="utf-8")

    print(f"TRUSTPASS_DEPLOYED_API_E2E_OK {json.dumps(proof, sort_keys=True)}")


if __name__ == "__main__":
    main()
