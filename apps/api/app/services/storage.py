from __future__ import annotations

from dataclasses import dataclass
import hashlib
from pathlib import Path
from uuid import UUID, uuid4

from app.core.config import Settings


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


def _safe_file_name(file_name: str) -> str:
    return Path(file_name.replace("\\", "/")).name.replace("\x00", "_") or "document"


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
        safe_name = _safe_file_name(file_name)
        object_key = f"{organization_id}/{uuid4()}-{safe_name}"
        target = self.root / object_key
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
        return StoredObject(
            provider="local",
            bucket=None,
            object_key=object_key,
            size_bytes=len(content),
            mime_type=mime_type,
            checksum_sha256=hashlib.sha256(content).hexdigest(),
        )

    def signed_url(self, object_key: str, expires_in_seconds: int = 900) -> str:
        return f"local://{object_key}?expires_in={expires_in_seconds}"


class S3StorageService(StorageService):
    provider = "s3"

    def __init__(self, *, bucket: str, region: str | None, endpoint_url: str | None) -> None:
        import boto3

        self.bucket = bucket
        self.client = boto3.client("s3", region_name=region, endpoint_url=endpoint_url)

    def put_document(
        self,
        organization_id: UUID,
        file_name: str,
        content: bytes,
        mime_type: str,
    ) -> StoredObject:
        safe_name = _safe_file_name(file_name)
        digest = hashlib.sha256(content).hexdigest()
        object_key = f"{organization_id}/{digest[:16]}-{safe_name}"
        self.client.put_object(
            Bucket=self.bucket,
            Key=object_key,
            Body=content,
            ContentType=mime_type,
            Metadata={"sha256": digest, "organization_id": str(organization_id)},
        )
        return StoredObject(
            provider=self.provider,
            bucket=self.bucket,
            object_key=object_key,
            size_bytes=len(content),
            mime_type=mime_type,
            checksum_sha256=digest,
        )

    def signed_url(self, object_key: str, expires_in_seconds: int = 900) -> str:
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": object_key},
            ExpiresIn=expires_in_seconds,
        )


def get_storage_service(settings: Settings) -> StorageService:
    if settings.storage_provider == "s3":
        if not settings.s3_bucket:
            raise RuntimeError("S3 storage requires S3_BUCKET")
        return S3StorageService(
            bucket=settings.s3_bucket,
            region=settings.s3_region,
            endpoint_url=settings.s3_endpoint_url,
        )
    if settings.storage_provider == "local":
        return LocalStorageService(settings.local_storage_root)
    raise RuntimeError(f"Unsupported storage provider: {settings.storage_provider}")
