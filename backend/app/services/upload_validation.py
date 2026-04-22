from __future__ import annotations

import os
from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings
from app.exceptions import InvalidUploadError
from app.services.storage import sanitize_filename


def read_upload_sample(upload_file_object: UploadFile, sample_size: int = 512) -> bytes:
    file_object = getattr(upload_file_object, "file", None)
    if file_object is None:
        return b""

    position = file_object.tell()
    sample = file_object.read(sample_size)
    file_object.seek(position)
    return sample


def sniff_image_content_type(sample: bytes) -> str | None:
    if sample.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if sample.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if len(sample) >= 12 and sample[:4] == b"RIFF" and sample[8:12] == b"WEBP":
        return "image/webp"
    return None


def validate_cover_upload(upload_file_object: UploadFile) -> tuple[str, str]:
    safe_filename = sanitize_filename(upload_file_object.filename)
    extension = Path(safe_filename).suffix.lower()

    if extension not in set(settings.ALLOWED_IMAGE_EXTENSIONS):
        raise InvalidUploadError("Unsupported cover image extension")

    sniffed_content_type = sniff_image_content_type(read_upload_sample(upload_file_object))
    if sniffed_content_type is None:
        raise InvalidUploadError("Unsupported cover image content")

    if extension in {".jpg", ".jpeg"} and sniffed_content_type == "image/jpeg":
        return safe_filename, sniffed_content_type

    if extension == ".png" and sniffed_content_type == "image/png":
        return safe_filename, sniffed_content_type

    if extension == ".webp" and sniffed_content_type == "image/webp":
        return safe_filename, sniffed_content_type

    raise InvalidUploadError("Cover image content does not match extension")


def write_upload_to_temp_file(upload_file_object: UploadFile, suffix: str, max_file_size: int) -> tuple[str, int]:
    total_size = 0
    temp_file_path = ""

    try:
        with NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file_path = temp_file.name
            while True:
                chunk = upload_file_object.file.read(1024 * 1024)
                if not chunk:
                    break

                total_size += len(chunk)
                if total_size > max_file_size:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File exceeds max size of {max_file_size} bytes",
                    )

                temp_file.write(chunk)
    except Exception:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        raise

    if total_size == 0:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty files cannot be uploaded",
        )

    return temp_file_path, total_size
