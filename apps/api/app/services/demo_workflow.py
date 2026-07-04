from __future__ import annotations

from copy import deepcopy
from threading import Lock
from typing import Any

from app.models.enums import BuyerRequestStatus, VerificationStatus


_DEFAULT_STATE: dict[str, Any] = {
    "vendors": [
        {
            "id": "atlas-freight-partners",
            "name": "Atlas Freight Partners",
            "category": "Logistics",
            "location": "Mumbai, IN",
            "trust_score": 88,
            "trust_level": "trusted",
            "status": VerificationStatus.approved.value,
            "badges": ["Verified", "Insurance checked"],
            "buyer_safe_summary": "Regional logistics provider with verified identity, tax, and insurance metadata.",
            "private_review_notes": "Seeded private document evidence is admin-only and not exposed to buyer search.",
        },
        {
            "id": "northstar-digital-studio",
            "name": "Northstar Digital Studio",
            "category": "Digital services",
            "location": "Bengaluru, IN",
            "trust_score": 73,
            "trust_level": "verified",
            "status": VerificationStatus.under_review.value,
            "badges": ["Identity checked"],
            "buyer_safe_summary": "Digital delivery studio with identity checks complete and compliance review in progress.",
            "private_review_notes": "Pending weighted document checks remain visible only to admins.",
        },
        {
            "id": "clearpath-advisory",
            "name": "Clearpath Advisory",
            "category": "Consulting",
            "location": "Delhi, IN",
            "trust_score": 42,
            "trust_level": "in_review",
            "status": VerificationStatus.changes_requested.value,
            "badges": [],
            "buyer_safe_summary": "Operations advisory vendor with profile data under review.",
            "private_review_notes": "Admin requested changes for missing tax and reference evidence.",
        },
    ],
    "documents": [
        {"id": "doc-business-registration", "name": "Business registration", "status": "approved", "expiry": "2027-03-30"},
        {"id": "doc-gst-certificate", "name": "GST certificate", "status": "approved", "expiry": "2027-03-30"},
        {"id": "doc-insurance-certificate", "name": "Insurance certificate", "status": "renewal_due", "expiry": "2026-08-15"},
    ],
    "review_queue": [
        {
            "id": "vr-1007",
            "vendor_id": "northstar-digital-studio",
            "vendor_name": "Northstar Digital Studio",
            "category": "Digital services",
            "submitted_at": "2026-06-27",
            "documents": 7,
            "risk": "medium",
            "status": VerificationStatus.under_review.value,
            "weighted_checks": [
                {"category": "identity", "status": "passed", "weight": 15, "score_awarded": 15},
                {"category": "tax", "status": "pending", "weight": 20, "score_awarded": 0},
                {"category": "references", "status": "pending", "weight": 15, "score_awarded": 0},
            ],
        },
        {
            "id": "vr-1008",
            "vendor_id": "clearpath-advisory",
            "vendor_name": "Clearpath Advisory",
            "category": "Consulting",
            "submitted_at": "2026-06-29",
            "documents": 4,
            "risk": "high",
            "status": VerificationStatus.changes_requested.value,
            "weighted_checks": [
                {"category": "identity", "status": "passed", "weight": 15, "score_awarded": 15},
                {"category": "tax", "status": "failed", "weight": 20, "score_awarded": 0},
                {"category": "references", "status": "pending", "weight": 15, "score_awarded": 0},
            ],
        },
    ],
    "shortlists": [],
    "buyer_requests": [],
    "notifications": [
        {"id": "ntf-1", "subject": "Verification under review", "status": "queued"},
        {"id": "ntf-2", "subject": "New review assigned", "status": "queued"},
    ],
    "demo_requests": [],
    "audit_events": [],
}

_STATE = deepcopy(_DEFAULT_STATE)
_LOCK = Lock()


def _public_vendor(vendor: dict[str, Any]) -> dict[str, Any]:
    allowed_fields = {
        "id",
        "name",
        "category",
        "location",
        "trust_score",
        "trust_level",
        "status",
        "badges",
        "buyer_safe_summary",
    }
    return {key: deepcopy(value) for key, value in vendor.items() if key in allowed_fields}


def reset_demo_state() -> dict[str, Any]:
    with _LOCK:
        _STATE.clear()
        _STATE.update(deepcopy(_DEFAULT_STATE))
        return deepcopy(_STATE)


def get_demo_state() -> dict[str, Any]:
    with _LOCK:
        return deepcopy(_STATE)


def demo_health() -> dict[str, Any]:
    state = get_demo_state()
    return {
        "mode": "demo",
        "vendors": len(state["vendors"]),
        "review_queue": len(state["review_queue"]),
        "shortlists": len(state["shortlists"]),
        "buyer_requests": len(state["buyer_requests"]),
        "contract": "vendor -> buyer -> admin -> billing-ready contact",
    }


def submit_vendor_renewal() -> dict[str, Any]:
    with _LOCK:
        for document in _STATE["documents"]:
            if document["id"] == "doc-insurance-certificate":
                document["status"] = "submitted"
                document["expiry"] = "2027-08-15"
                break
        _STATE["audit_events"].append(
            {
                "action": "submit",
                "entity_type": "document",
                "entity_id": "doc-insurance-certificate",
                "summary": "Vendor submitted insurance renewal evidence.",
            }
        )
        return {"documents": deepcopy(_STATE["documents"]), "renewal_submitted": True}


def search_demo_vendors(q: str | None = None, category: str | None = None) -> list[dict[str, Any]]:
    term = (q or "").strip().lower()
    normalized_category = (category or "All").strip().lower()
    with _LOCK:
        vendors = []
        for vendor in _STATE["vendors"]:
            if normalized_category not in {"", "all"} and vendor["category"].lower() != normalized_category:
                continue
            haystack = " ".join(
                [
                    vendor["name"],
                    vendor["category"],
                    vendor["location"],
                    vendor["trust_level"],
                    " ".join(vendor["badges"]),
                ]
            ).lower()
            if term and term not in haystack:
                continue
            vendors.append(_public_vendor(vendor))
        return vendors


def add_demo_shortlist(vendor_id: str, notes: str | None = None) -> dict[str, Any]:
    with _LOCK:
        vendor = _find_vendor(vendor_id)
        existing = next((item for item in _STATE["shortlists"] if item["vendor_id"] == vendor_id), None)
        if existing:
            return deepcopy(existing)
        shortlist = {
            "id": f"sl-{len(_STATE['shortlists']) + 1}",
            "vendor_id": vendor_id,
            "vendor_name": vendor["name"],
            "status": "active",
            "notes": notes,
        }
        _STATE["shortlists"].append(shortlist)
        _STATE["audit_events"].append(
            {"action": "shortlist", "entity_type": "vendor", "entity_id": vendor_id, "summary": f"Buyer shortlisted {vendor['name']}."}
        )
        return deepcopy(shortlist)


def add_demo_buyer_request(vendor_id: str, subject: str, message: str) -> dict[str, Any]:
    with _LOCK:
        vendor = _find_vendor(vendor_id)
        request = {
            "id": f"bvr-{len(_STATE['buyer_requests']) + 1}",
            "vendor_id": vendor_id,
            "vendor_name": vendor["name"],
            "subject": subject,
            "message": message,
            "status": BuyerRequestStatus.open.value,
        }
        _STATE["buyer_requests"].append(request)
        _STATE["notifications"].append(
            {"id": f"ntf-{len(_STATE['notifications']) + 1}", "subject": f"Buyer requested info from {vendor['name']}", "status": "queued"}
        )
        _STATE["audit_events"].append(
            {"action": "request_info", "entity_type": "buyer_vendor_request", "entity_id": request["id"], "summary": request["subject"]}
        )
        return deepcopy(request)


def list_demo_reviews() -> list[dict[str, Any]]:
    with _LOCK:
        return deepcopy(_STATE["review_queue"])


def approve_demo_review(review_id: str) -> dict[str, Any]:
    with _LOCK:
        review = _find_review(review_id)
        review["status"] = VerificationStatus.approved.value
        review["risk"] = "low"
        for check in review["weighted_checks"]:
            if check["status"] == "pending":
                check["status"] = "passed"
                check["score_awarded"] = check["weight"]
        score = min(100, sum(check["score_awarded"] for check in review["weighted_checks"]) + 38)
        vendor = _find_vendor(review["vendor_id"])
        vendor["status"] = VerificationStatus.approved.value
        vendor["trust_score"] = score
        vendor["trust_level"] = "trusted" if score >= 80 else "verified"
        if "Verified" not in vendor["badges"]:
            vendor["badges"].append("Verified")
        _STATE["audit_events"].append(
            {"action": "approve", "entity_type": "verification_request", "entity_id": review_id, "summary": f"Approved {review['vendor_name']}."}
        )
        return deepcopy(review)


def create_demo_request(name: str, email: str, organization: str, plan: str, message: str) -> dict[str, Any]:
    with _LOCK:
        request = {
            "id": f"demo-{len(_STATE['demo_requests']) + 1}",
            "name": name,
            "email": email,
            "organization": organization,
            "plan": plan,
            "message": message,
            "status": "received",
        }
        _STATE["demo_requests"].append(request)
        _STATE["audit_events"].append(
            {"action": "create", "entity_type": "demo_request", "entity_id": request["id"], "summary": f"Demo request received for {organization}."}
        )
        return deepcopy(request)


def _find_vendor(vendor_id: str) -> dict[str, Any]:
    vendor = next((item for item in _STATE["vendors"] if item["id"] == vendor_id), None)
    if vendor is None:
        raise ValueError(f"Unknown vendor: {vendor_id}")
    return vendor


def _find_review(review_id: str) -> dict[str, Any]:
    review = next((item for item in _STATE["review_queue"] if item["id"] == review_id), None)
    if review is None:
        raise ValueError(f"Unknown review: {review_id}")
    return review
