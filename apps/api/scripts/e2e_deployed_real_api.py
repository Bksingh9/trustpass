from __future__ import annotations

import argparse
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError
from urllib.request import Request, urlopen


def normalize_base_url(value: str) -> str:
    base_url = value.rstrip("/")
    return base_url if base_url.endswith("/api/v1") else f"{base_url}/api/v1"


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
    expected_statuses: set[int] | None = None,
    attempts: int = 5,
) -> tuple[int, dict[str, Any], dict[str, str]]:
    expected = expected_statuses or {200}
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    request_headers = {"accept": "application/json", **(headers or {})}
    if body is not None:
        request_headers["content-type"] = "application/json"
    request = Request(f"{base_url}{path}", data=body, headers=request_headers, method=method)

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
    return status, (json.loads(response_body) if response_body else {}), response_headers


def assert_request_id(headers: dict[str, str], request_id: str) -> None:
    assert_condition(headers.get("x-request-id") == request_id, f"request id mismatch for {request_id}")


def run_authenticated_read_checks(base_url: str, token: str, proof: dict[str, Any]) -> None:
    headers = {"authorization": f"Bearer {token}"}
    _, me, _ = request_json(base_url, "GET", "/auth/me", headers=headers)
    assert_condition(me.get("data", {}).get("user_id"), "Supabase token is not linked to a TRUSTPASS user")
    _, memberships, _ = request_json(base_url, "GET", "/orgs/memberships", headers=headers)
    rows = memberships.get("data", {}).get("memberships", [])
    assert_condition(rows, "Supabase user has no active TRUSTPASS organization membership")

    role = os.getenv("TRUSTPASS_REAL_ROLE", "")
    if role == "vendor":
        request_json(base_url, "GET", "/vendors/dashboard", headers=headers)
        request_json(base_url, "GET", "/documents/types", headers=headers)
    elif role == "buyer":
        request_json(base_url, "GET", "/buyers/search", headers=headers)
        request_json(base_url, "GET", "/buyers/shortlists", headers=headers)
    proof["checks"].append("authenticated_customer_reads")


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify the deployed TRUSTPASS real-customer API contract.")
    parser.add_argument("--base-url", default=os.getenv("TRUSTPASS_API_BASE_URL", ""))
    parser.add_argument("--proof-out", default=os.getenv("TRUSTPASS_API_PROOF_PATH", ""))
    args = parser.parse_args()
    assert_condition(args.base_url, "TRUSTPASS_API_BASE_URL or --base-url is required")

    base_url = normalize_base_url(args.base_url)
    run_id = f"api-contract-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    proof: dict[str, Any] = {
        "baseUrl": base_url,
        "runId": run_id,
        "startedAt": datetime.now(timezone.utc).isoformat(),
        "checks": [],
        "authenticatedCustomerChecks": "not_configured",
    }

    _, health, health_headers = request_json(base_url, "GET", "/health")
    assert_condition(health.get("status") == "ok", "health did not return ok")
    assert_condition(health.get("demo_data_enabled") is False, "production API reports demo data enabled")
    assert_condition(health_headers.get("x-request-id"), "health response is missing x-request-id")
    proof["checks"].append("health")

    _, readiness, _ = request_json(base_url, "GET", "/readiness")
    assert_condition(readiness.get("status") == "ready", "readiness did not return ready")
    assert_condition(readiness.get("postgres_connected") is True, "Postgres is not connected")
    proof["checks"].append("readiness")

    _, openapi, _ = request_json(base_url, "GET", "/openapi.json")
    required_paths = {
        "/api/v1/auth/me",
        "/api/v1/orgs/",
        "/api/v1/vendors/dashboard",
        "/api/v1/buyers/search",
        "/api/v1/documents/upload",
        "/api/v1/documents/types",
        "/api/v1/notifications/{notification_id}/read",
        "/api/v1/billing/checkout",
    }
    missing_paths = sorted(required_paths - set(openapi.get("paths", {})))
    assert_condition(not missing_paths, f"deployed OpenAPI contract is missing: {missing_paths}")
    proof["checks"].append("openapi_contract")

    request_json(base_url, "GET", "/demo/health", expected_statuses={404})
    proof["checks"].append("demo_routes_disabled")

    request_id = f"{run_id}-public-state"
    _, state, state_headers = request_json(
        base_url,
        "GET",
        "/api/trustpass",
        headers={"x-request-id": request_id},
    )
    assert_request_id(state_headers, request_id)
    public_data = state.get("data", {})
    for private_key in ("buyers", "documents", "buyer_requests", "audit_events", "trust_score_snapshots", "notifications"):
        assert_condition(public_data.get(private_key) == [], f"public state exposed private collection: {private_key}")
    assert_condition(
        state.get("meta", {}).get("data_classification") in {"empty", "customer_data_present"},
        "public state has an invalid data classification",
    )
    proof["checks"].append("public_data_boundary")

    _, operational, _ = request_json(base_url, "GET", "/api/operational-proof")
    assert_condition(operational.get("demo_data_enabled") is False, "operational proof reports demo data enabled")
    assert_condition(operational.get("postgres_connected") is True, "operational proof does not see Postgres")
    assert_condition(operational.get("data_classification") in {"empty", "customer_data_present"}, "invalid operational data classification")
    proof["checks"].append("operational_proof")

    unauthorized_paths = (
        ("GET", "/auth/me", None),
        ("GET", "/orgs/memberships", None),
        ("GET", "/vendors/dashboard", None),
        ("GET", "/buyers/search", None),
        ("GET", "/documents/types", None),
        ("GET", "/billing/plans", None),
        ("POST", "/orgs/", {}),
        ("POST", "/api/trustpass", {"action": "create_vendor"}),
    )
    for method, path, payload in unauthorized_paths:
        request_json(base_url, method, path, payload=payload, expected_statuses={401})
    proof["checks"].append("unauthenticated_routes_rejected")

    token = os.getenv("TRUSTPASS_REAL_ACCESS_TOKEN", "")
    if token:
        run_authenticated_read_checks(base_url, token, proof)
        proof["authenticatedCustomerChecks"] = "passed"
    elif os.getenv("TRUSTPASS_REQUIRE_REAL_AUTH") == "1":
        raise AssertionError("TRUSTPASS_REAL_ACCESS_TOKEN is required for authenticated customer checks")

    proof["completedAt"] = datetime.now(timezone.utc).isoformat()
    proof["status"] = "passed"
    if args.proof_out:
        proof_path = Path(args.proof_out)
        proof_path.parent.mkdir(parents=True, exist_ok=True)
        proof_path.write_text(json.dumps(proof, indent=2) + "\n", encoding="utf-8")
    print(f"TRUSTPASS_DEPLOYED_API_CONTRACT_OK {json.dumps(proof, sort_keys=True)}")


if __name__ == "__main__":
    main()

