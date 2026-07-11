from __future__ import annotations

from dataclasses import dataclass
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.api.v1.routes.admin import _authorize_seed_context
from app.api.v1.routes.live_gateway import _authorize_gateway_writer, _state_metadata
from app.core.config import Settings
from app.core.security import (
    UserContext,
    _context_from_memberships,
    _resolve_auth_mode,
)
from app.main import create_app
from app.models.enums import MembershipRole, MembershipStatus, UserStatus


@dataclass
class _User:
    id: object
    auth_subject_id: str
    status: UserStatus = UserStatus.active


@dataclass
class _Membership:
    user_id: object
    organization_id: object
    role: MembershipRole
    status: MembershipStatus = MembershipStatus.active


class _ScalarResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class _FakeDb:
    def __init__(self, *values):
        self.values = list(values)

    def execute(self, _statement):
        return _ScalarResult(self.values.pop(0))


class _ScalarListResult:
    def __init__(self, values):
        self.values = values

    def scalars(self):
        return self

    def all(self):
        return self.values


class _FakeDbForMemberships:
    def __init__(self, user, memberships):
        self.values = [_ScalarResult(user), _ScalarListResult(memberships)]

    def execute(self, _statement):
        return self.values.pop(0)


def _context(
    *,
    roles: tuple[str, ...],
    auth_subject_id: str = "seed-admin-2",
    user_id=None,
    organization_id=None,
) -> UserContext:
    return UserContext(
        auth_subject_id=auth_subject_id,
        user_id=user_id,
        organization_id=organization_id,
        roles=roles,
    )


def test_live_gateway_post_requires_authorization_header() -> None:
    client = TestClient(create_app())

    response = client.post("/api/v1/api/trustpass", json={"action": "create_vendor"})

    assert response.status_code == 401
    assert response.json()["detail"] == "Missing Authorization header"


def test_auth_mode_auto_defaults_to_supabase_jwt_in_production() -> None:
    settings = Settings(environment="production", auth_mode="auto")

    assert _resolve_auth_mode(settings) == "supabase_jwt"


def test_auth_mode_auto_keeps_development_headers_outside_production() -> None:
    settings = Settings(environment="local", auth_mode="auto")

    assert _resolve_auth_mode(settings) == "development_headers"


def test_auth_mode_can_explicitly_allow_development_headers_for_demo_proof() -> None:
    settings = Settings(environment="production", auth_mode="development_headers")

    assert _resolve_auth_mode(settings) == "development_headers"


def test_live_gateway_writer_rejects_non_admin_role() -> None:
    with pytest.raises(HTTPException) as exc_info:
        _authorize_gateway_writer(_context(roles=("vendor",)), _FakeDb())

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "Admin role required"


def test_live_gateway_writer_rejects_unknown_auth_subject() -> None:
    with pytest.raises(HTTPException) as exc_info:
        _authorize_gateway_writer(_context(roles=("super_admin",), auth_subject_id="missing-user"), _FakeDb(None))

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "Active TRUSTPASS user required"


def test_live_gateway_writer_rejects_without_active_admin_membership() -> None:
    user = _User(id=uuid4(), auth_subject_id="seed-admin-2")

    with pytest.raises(HTTPException) as exc_info:
        _authorize_gateway_writer(
            _context(roles=("super_admin",), user_id=user.id, organization_id=uuid4()),
            _FakeDb(user, None),
        )

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "Active admin membership required"


def test_live_gateway_writer_requires_user_context() -> None:
    user = _User(id=uuid4(), auth_subject_id="seed-admin-2")

    with pytest.raises(HTTPException) as exc_info:
        _authorize_gateway_writer(_context(roles=("super_admin",)), _FakeDb(user))

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "Authenticated user context required"


def test_live_gateway_writer_requires_organization_context() -> None:
    user = _User(id=uuid4(), auth_subject_id="seed-admin-2")

    with pytest.raises(HTTPException) as exc_info:
        _authorize_gateway_writer(
            _context(roles=("super_admin",), user_id=user.id),
            _FakeDb(user),
        )

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "Authenticated organization context required"


def test_live_gateway_writer_rejects_mismatched_context_user() -> None:
    user = _User(id=uuid4(), auth_subject_id="seed-admin-2")

    with pytest.raises(HTTPException) as exc_info:
        _authorize_gateway_writer(
            _context(roles=("super_admin",), user_id=uuid4()),
            _FakeDb(user),
        )

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "Authenticated user context mismatch"


def test_live_gateway_writer_rejects_mismatched_context_organization() -> None:
    user = _User(id=uuid4(), auth_subject_id="seed-admin-2")
    membership = _Membership(user_id=user.id, organization_id=uuid4(), role=MembershipRole.super_admin)

    with pytest.raises(HTTPException) as exc_info:
        _authorize_gateway_writer(
            _context(roles=("super_admin",), user_id=user.id, organization_id=uuid4()),
            _FakeDb(user, membership),
        )

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "Authenticated organization context mismatch"


def test_live_gateway_writer_accepts_active_admin_membership() -> None:
    user = _User(id=uuid4(), auth_subject_id="seed-admin-2")
    organization_id = uuid4()
    membership = _Membership(user_id=user.id, organization_id=organization_id, role=MembershipRole.super_admin)

    actor = _authorize_gateway_writer(
        _context(roles=("super_admin",), user_id=user.id, organization_id=organization_id),
        _FakeDb(user, membership),
    )

    assert actor is user


def test_supabase_mode_derives_roles_from_active_membership_not_headers() -> None:
    user = _User(id=uuid4(), auth_subject_id="supabase-user")
    organization_id = uuid4()
    membership = _Membership(
        user_id=user.id,
        organization_id=organization_id,
        role=MembershipRole.buyer,
    )

    context = _context_from_memberships(
        _FakeDbForMemberships(user, [membership]),
        auth_subject_id="supabase-user",
        requested_organization_id=organization_id,
    )

    assert context.user_id == user.id
    assert context.organization_id == organization_id
    assert context.roles == ("buyer",)


def test_supabase_mode_rejects_spoofed_organization_context() -> None:
    user = _User(id=uuid4(), auth_subject_id="supabase-user")
    membership = _Membership(
        user_id=user.id,
        organization_id=uuid4(),
        role=MembershipRole.buyer,
    )

    with pytest.raises(HTTPException) as exc_info:
        _context_from_memberships(
            _FakeDbForMemberships(user, [membership]),
            auth_subject_id="supabase-user",
            requested_organization_id=uuid4(),
        )

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "Authenticated organization context mismatch"


def test_live_gateway_state_metadata_marks_seed_and_qa_records_as_synthetic() -> None:
    state = {
        "vendors": [
            {"name": "Atlas Freight Partners"},
            {"name": "QA Vendor pages-final-qa-20260706005728"},
            {"name": "TRUSTPASS Public Vendor public-gateway-20260705214052-sjlw7n"},
        ],
        "buyers": [
            {"name": "Brightline Procurement"},
            {"name": "TRUSTPASS QA Buyer pages-qa-20260706003205"},
        ],
    }

    metadata = _state_metadata(state)

    assert metadata["data_classification"] == "synthetic_seed_and_qa"
    assert metadata["contains_customer_data"] is False
    assert metadata["organization_records"] == {
        "total": 5,
        "synthetic": 5,
        "seed": 2,
        "qa_or_proof": 3,
        "unknown": 0,
    }


def test_live_gateway_state_metadata_keeps_unknown_records_unclassified() -> None:
    state = {
        "vendors": [{"name": "Atlas Freight Partners"}, {"name": "Acme Real Supplier"}],
        "buyers": [{"name": "Brightline Procurement"}],
    }

    metadata = _state_metadata(state)

    assert metadata["data_classification"] == "mixed_or_unknown"
    assert metadata["contains_customer_data"] is None
    assert metadata["organization_records"]["unknown"] == 1


def test_seed_context_requires_separate_token_in_production() -> None:
    settings = Settings(environment="production", seed_context_token="proof-token")

    with pytest.raises(HTTPException) as exc_info:
        _authorize_seed_context(settings, None)

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "Seed context proof token required"


def test_seed_context_accepts_separate_token_in_production() -> None:
    settings = Settings(environment="production", seed_context_token="proof-token")

    _authorize_seed_context(settings, "proof-token")


def test_seed_context_remains_available_for_local_development() -> None:
    settings = Settings(environment="local", seed_context_token=None)

    _authorize_seed_context(settings, None)
