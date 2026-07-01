from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from uuid import UUID


@dataclass(frozen=True)
class StoredObject:
    provider: str
    bucket: str | None
    object_key: str
    size_bytes: int
    mime_type: str
    checksum_sha256: str | None = None


class StorageService:
    def put_document(
        self,
        organization_id: UUID,
        file_name: str,
        content: bytes,
        mime_type: str,
    ) -> StoredObject:
        raise NotImplementedError

    def signed_url(self, object_key: str, expires_in_seconds: int = 900) -> str:
        raise NotImplementedError


class LocalStorageService(StorageService):
    def __init__(self, root: str) -> None:
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def put_document(
        self,
        organization_id: UUID,
        file_name: str,
        content: bytes,
        mime_type: str,
    ) -> StoredObject:
        safe_name = file_name.replace("/", "_").replace("\\", "_")
        object_key = f"{organization_id}/{safe_name}"
        target = self.root / object_key
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
        return StoredObject(
            provider="local",
            bucket=None,
            object_key=object_key,
            size_bytes=len(content),
            mime_type=mime_type,
        )

    def signed_url(self, object_key: str, expires_in_seconds: int = 900) -> str:
        return f"local://{object_key}?expires_in={expires_in_seconds}"

