from __future__ import annotations

from dataclasses import dataclass
from typing import Iterator

from fastapi import HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.models import Track, TrackStatus
from app.services.storage import get_object_stream, stat_object


STREAM_CHUNK_SIZE = 64 * 1024
STREAM_QUALITY_MAP = {
    "original": "original_object_key",
    "128": "128",
    "320": "320",
}
DEFAULT_CONTENT_TYPES = {
    "original": "audio/wav",
    "128": "audio/mpeg",
    "320": "audio/mpeg",
}


@dataclass(frozen=True)
class ByteRange:
    start: int
    end: int
    total: int

    @property
    def length(self) -> int:
        return self.end - self.start + 1


def _get_public_streamable_track(db: Session, track_id: int) -> Track:
    track = (
        db.query(Track)
        .filter(
            Track.id == track_id,
            Track.status == TrackStatus.approved,
            Track.is_public.is_(True),
        )
        .first()
    )
    if track is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Track not found")
    return track


def _get_storage_metadata(track: Track) -> tuple[dict, dict]:
    metadata_json = track.metadata_json if isinstance(track.metadata_json, dict) else {}
    storage = metadata_json.get("storage")
    if not isinstance(storage, dict):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Track media not found")
    return metadata_json, storage


def _resolve_object_key(track: Track, quality: str) -> tuple[str, str | None]:
    if quality not in STREAM_QUALITY_MAP:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported stream quality")

    metadata_json, storage = _get_storage_metadata(track)

    if quality == "original":
        object_key = storage.get("original_object_key")
    else:
        processed = storage.get("processed_object_keys")
        object_key = processed.get(quality) if isinstance(processed, dict) else None

    if not isinstance(object_key, str) or not object_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requested media asset is not ready")

    upload = metadata_json.get("upload")
    content_type = upload.get("content_type") if isinstance(upload, dict) else None
    return object_key, content_type


def _parse_range(range_header: str | None, total_size: int) -> ByteRange | None:
    if not range_header:
        return None

    if not range_header.startswith("bytes="):
        raise HTTPException(status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE, detail="Invalid range unit")

    raw_range = range_header[len("bytes="):].strip()
    if "," in raw_range:
        raise HTTPException(
            status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE,
            detail="Multiple ranges are not supported",
        )

    start_text, sep, end_text = raw_range.partition("-")
    if sep != "-":
        raise HTTPException(status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE, detail="Invalid range")

    if not start_text and not end_text:
        raise HTTPException(status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE, detail="Invalid range")

    if start_text:
        start = int(start_text)
        end = total_size - 1 if not end_text else int(end_text)
    else:
        suffix_length = int(end_text)
        if suffix_length <= 0:
            raise HTTPException(status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE, detail="Invalid range")
        suffix_length = min(suffix_length, total_size)
        start = total_size - suffix_length
        end = total_size - 1

    if start < 0 or end < start or start >= total_size:
        raise HTTPException(status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE, detail="Range not satisfiable")

    end = min(end, total_size - 1)
    return ByteRange(start=start, end=end, total=total_size)


def _iter_stream(object_key: str, byte_range: ByteRange | None) -> Iterator[bytes]:
    offset = 0 if byte_range is None else byte_range.start
    length = None if byte_range is None else byte_range.length
    response = get_object_stream(object_key, offset=offset, length=length)
    try:
        for chunk in response.stream(STREAM_CHUNK_SIZE):
            if chunk:
                yield chunk
    finally:
        response.close()
        response.release_conn()


def build_track_stream_response(
    db: Session,
    track_id: int,
    quality: str,
    range_header: str | None = None,
) -> StreamingResponse:
    track = _get_public_streamable_track(db, track_id)
    object_key, original_content_type = _resolve_object_key(track, quality)
    object_info = stat_object(object_key)
    byte_range = _parse_range(range_header, object_info.size_bytes)

    content_type = object_info.content_type or original_content_type or DEFAULT_CONTENT_TYPES[quality]
    headers = {
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
    }
    status_code = status.HTTP_200_OK

    if byte_range is not None:
        headers["Content-Range"] = f"bytes {byte_range.start}-{byte_range.end}/{byte_range.total}"
        headers["Content-Length"] = str(byte_range.length)
        status_code = status.HTTP_206_PARTIAL_CONTENT
    else:
        headers["Content-Length"] = str(object_info.size_bytes)

    return StreamingResponse(
        _iter_stream(object_key, byte_range),
        media_type=content_type,
        status_code=status_code,
        headers=headers,
    )
