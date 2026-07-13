from __future__ import annotations

from tempfile import TemporaryDirectory
from uuid import uuid4

from app.services.billing import MockBillingAdapter
from app.services.storage import LocalStorageService


def test_local_storage_isolates_objects_and_records_checksum() -> None:
    organization_id = uuid4()
    with TemporaryDirectory() as root:
        service = LocalStorageService(root)
        stored = service.put_document(
            organization_id=organization_id,
            file_name="../insurance.pdf",
            content=b"trustpass",
            mime_type="application/pdf",
        )

        assert stored.provider == "local"
        assert stored.object_key.startswith(f"{organization_id}/")
        assert ".." not in stored.object_key
        assert stored.checksum_sha256 == "fb9718d4b921237e9339582ad919285186a27755f2a8e2ca701a701b25f6ab74"


def test_mock_billing_adapter_is_deterministic() -> None:
    organization_id = uuid4()
    session = MockBillingAdapter().create_checkout_session(organization_id, "vendor_growth")

    assert session.provider == "mock"
    assert session.external_id == f"mock_{organization_id}_vendor_growth"
    assert session.checkout_url.endswith(session.external_id)
