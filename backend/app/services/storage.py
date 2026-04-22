from __future__ import annotations

import mimetypes
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from uuid import uuid4

from minio import Minio
from urllib3.response import BaseHTTPResponse
from app.core.config import settings


TRACKS_STORAGE_PREFIX = "tracks"
COLLECTIONS_STORAGE_PREFIX = "collections"
PROFILES_STORAGE_PREFIX = "profiles"


@dataclass(frozen=True)
class StoredObject:
    bucket: str
    object_key: str
    content_type: str | None = None
    size_bytes: int | None = None


@dataclass(frozen=True)
class ObjectInfo:
    bucket: str
    object_key: str
    size_bytes: int
    content_type: str | None = None


def get_storage_client() -> Minio:
    return Minio(
        settings.MINIO_ENDPOINT,
        access_key=settings.MINIO_ACCESS_KEY,
        secret_key=settings.MINIO_SECRET_KEY,
        secure=settings.MINIO_SECURE,
    )


def ensure_bucket_exists(client: Minio | None = None) -> Minio:
    client = client or get_storage_client()
    if not client.bucket_exists(settings.MINIO_BUCKET):
        client.make_bucket(settings.MINIO_BUCKET)
    return client


def guess_content_type(filename: str | None) -> str | None:
    if not filename:
        return None

    content_type, _ = mimetypes.guess_type(filename)
    return content_type


def sanitize_filename(filename: str | None) -> str:
    name = Path(filename or "upload.bin").name
    safe = "".join(char if char.isalnum() or char in {".", "-", "_"} else "_" for char in name)
    return safe.strip("._") or "upload.bin"


def build_original_object_key(user_id: int, track_id: int, filename: str | None) -> str:
    extension = Path(filename or "upload.bin").suffix.lower() or ".bin"
    return f"{TRACKS_STORAGE_PREFIX}/{user_id}/{track_id}/original/{uuid4().hex}{extension}"


def build_derived_object_key(user_id: int, track_id: int, quality: str) -> str:
    return f"{TRACKS_STORAGE_PREFIX}/{user_id}/{track_id}/derived/{quality}.mp3"


def build_cover_object_key(user_id: int, track_id: int, filename: str | None) -> str:
    extension = Path(filename or "cover.bin").suffix.lower() or ".bin"
    return f"{TRACKS_STORAGE_PREFIX}/{user_id}/{track_id}/cover/{uuid4().hex}{extension}"


def build_collection_cover_object_key(collection_id: int, filename: str | None) -> str:
    extension = Path(filename or "cover.bin").suffix.lower() or ".bin"
    return f"{COLLECTIONS_STORAGE_PREFIX}/{collection_id}/cover/{uuid4().hex}{extension}"


def build_profile_image_object_key(user_id: int, image_kind: str, filename: str | None) -> str:
    extension = Path(filename or "profile.bin").suffix.lower() or ".bin"
    return f"{PROFILES_STORAGE_PREFIX}/{user_id}/{image_kind}/{uuid4().hex}{extension}"


def upload_file(file_path: str, object_key: str, content_type: str | None = None) -> StoredObject:
    client = ensure_bucket_exists()
    resolved_content_type = content_type or guess_content_type(file_path) or "application/octet-stream"
    client.fput_object(
        settings.MINIO_BUCKET,
        object_key,
        file_path,
        content_type=resolved_content_type,
    )
    return StoredObject(
        bucket=settings.MINIO_BUCKET,
        object_key=object_key,
        content_type=resolved_content_type,
        size_bytes=os.path.getsize(file_path),
    )


def download_file(object_key: str, destination_path: str) -> None:
    client = ensure_bucket_exists()
    destination = Path(destination_path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    client.fget_object(settings.MINIO_BUCKET, object_key, str(destination))


def stat_object(object_key: str) -> ObjectInfo:
    client = ensure_bucket_exists()
    result = client.stat_object(settings.MINIO_BUCKET, object_key)
    return ObjectInfo(
        bucket=settings.MINIO_BUCKET,
        object_key=object_key,
        size_bytes=result.size,
        content_type=getattr(result, "content_type", None),
    )


def get_object_stream(object_key: str, offset: int = 0, length: int | None = None) -> BaseHTTPResponse:
    client = ensure_bucket_exists()
    request_length = 0 if length is None else length
    return client.get_object(settings.MINIO_BUCKET, object_key, offset=offset, length=request_length)


def delete_objects(object_keys: Iterable[str]) -> None:
    try:
        client = ensure_bucket_exists()
    except Exception:
        return

    for object_key in object_keys:
        if not object_key:
            continue
        try:
            client.remove_object(settings.MINIO_BUCKET, object_key)
        except Exception:
            # Cleanup should remain best-effort.
            continue
