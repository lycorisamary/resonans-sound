from __future__ import annotations

import copy
import os
from datetime import datetime, timezone
from math import ceil
from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session, joinedload
import structlog

from app.celery_app import celery_app
from app.core.config import settings
from app.exceptions import InvalidUploadError, TrackAccessDeniedError, TrackConflictError, TrackNotFoundError
from app.models import AdminLog, Category, Track, TrackStatus, User
from app.policies import TrackDeletionPolicy, TrackUploadPolicy
from app.policies._roles import is_staff
from app.schemas import PaginatedResponse, TrackCreate, TrackResponse, TrackUpdate, TrackUploadResponse
from app.services.artists import get_required_own_artist_model
from app.services.catalog import serialize_track
from app.services.storage import (
    build_cover_object_key,
    build_original_object_key,
    delete_objects,
    sanitize_filename,
    upload_file,
)


logger = structlog.get_logger(__name__)


def _get_active_category(db: Session, category_id: int | None) -> Category | None:
    if category_id is None:
        return None

    category = (
        db.query(Category)
        .filter(Category.id == category_id, Category.is_active.is_(True))
        .first()
    )
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    return category


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _clone_json_document(value):
    if isinstance(value, (dict, list)):
        return copy.deepcopy(value)
    return value


def _snapshot_track_state(track: Track) -> dict[str, object]:
    return {
        "status": track.status,
        "file_size_bytes": track.file_size_bytes,
        "duration_seconds": track.duration_seconds,
        "original_url": track.original_url,
        "mp3_128_url": track.mp3_128_url,
        "mp3_320_url": track.mp3_320_url,
        "cover_image_url": track.cover_image_url,
        "waveform_data_json": _clone_json_document(track.waveform_data_json),
        "metadata_json": _clone_json_document(track.metadata_json),
        "rejection_reason": track.rejection_reason,
    }


def _restore_track_state(track: Track, snapshot: dict[str, object]) -> None:
    for field, value in snapshot.items():
        setattr(track, field, value)


def _get_track_stream_urls(track_id: int) -> dict[str, str]:
    base_url = f"{settings.API_PREFIX}/tracks/{track_id}/stream"
    return {
        "original": f"{base_url}?quality=original",
        "128": f"{base_url}?quality=128",
        "320": f"{base_url}?quality=320",
    }


def _extract_storage_keys(metadata_json: dict | None) -> list[str]:
    if not isinstance(metadata_json, dict):
        return []

    storage = metadata_json.get("storage")
    if not isinstance(storage, dict):
        return []

    keys: list[str] = []
    original_key = storage.get("original_object_key")
    if isinstance(original_key, str) and original_key:
        keys.append(original_key)

    processed_object_keys = storage.get("processed_object_keys")
    if isinstance(processed_object_keys, dict):
        for value in processed_object_keys.values():
            if isinstance(value, str) and value:
                keys.append(value)

    return keys


def _extract_cover_storage_key(metadata_json: dict | None) -> str | None:
    if not isinstance(metadata_json, dict):
        return None

    cover = metadata_json.get("cover")
    if not isinstance(cover, dict):
        return None

    object_key = cover.get("object_key")
    if isinstance(object_key, str) and object_key:
        return object_key

    return None


def _read_upload_sample(upload_file_object: UploadFile, sample_size: int = 512) -> bytes:
    file_object = getattr(upload_file_object, "file", None)
    if file_object is None:
        return b""

    position = file_object.tell()
    sample = file_object.read(sample_size)
    file_object.seek(position)
    return sample


def _sniff_audio_content_type(sample: bytes) -> str | None:
    if sample.startswith(b"ID3"):
        return "audio/mpeg"
    if len(sample) >= 2 and sample[0] == 0xFF and (sample[1] & 0xE0) == 0xE0:
        return "audio/mpeg"
    if len(sample) >= 12 and sample[:4] == b"RIFF" and sample[8:12] == b"WAVE":
        return "audio/wav"
    return None


def _sniff_image_content_type(sample: bytes) -> str | None:
    if sample.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if sample.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if len(sample) >= 12 and sample[:4] == b"RIFF" and sample[8:12] == b"WEBP":
        return "image/webp"
    return None


def _detect_upload_content_type(upload_file_object: UploadFile, extension: str) -> str:
    sample = _read_upload_sample(upload_file_object)
    sniffed_content_type = _sniff_audio_content_type(sample)
    if sniffed_content_type is None:
        raise InvalidUploadError("Unsupported audio file content")

    if extension == ".mp3" and sniffed_content_type == "audio/mpeg":
        return sniffed_content_type

    if extension == ".wav" and sniffed_content_type in set(settings.ALLOWED_AUDIO_FORMATS):
        return "audio/wav"

    raise InvalidUploadError("Audio file content does not match extension")


def _validate_upload(upload_file_object: UploadFile) -> tuple[str, str]:
    safe_filename = sanitize_filename(upload_file_object.filename)
    extension = Path(safe_filename).suffix.lower()

    if extension not in set(settings.ALLOWED_EXTENSIONS):
        raise InvalidUploadError("Unsupported audio file extension")

    content_type = _detect_upload_content_type(upload_file_object, extension)
    return safe_filename, content_type


def _validate_cover_upload(upload_file_object: UploadFile) -> tuple[str, str]:
    safe_filename = sanitize_filename(upload_file_object.filename)
    extension = Path(safe_filename).suffix.lower()

    if extension not in set(settings.ALLOWED_IMAGE_EXTENSIONS):
        raise InvalidUploadError("Unsupported cover image extension")

    sniffed_content_type = _sniff_image_content_type(_read_upload_sample(upload_file_object))
    if sniffed_content_type is None:
        raise InvalidUploadError("Unsupported cover image content")

    if extension in {".jpg", ".jpeg"} and sniffed_content_type == "image/jpeg":
        return safe_filename, sniffed_content_type

    if extension == ".png" and sniffed_content_type == "image/png":
        return safe_filename, sniffed_content_type

    if extension == ".webp" and sniffed_content_type == "image/webp":
        return safe_filename, sniffed_content_type

    raise InvalidUploadError("Cover image content does not match extension")


def _write_upload_to_temp_file(upload_file_object: UploadFile, suffix: str, max_file_size: int) -> tuple[str, int]:
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


def _build_track_upload_metadata(
    current_metadata: dict | None,
    original_object_key: str,
    file_size_bytes: int,
    original_filename: str,
    content_type: str,
    request_id: str | None = None,
) -> dict:
    metadata_json = copy.deepcopy(current_metadata) if isinstance(current_metadata, dict) else {}
    metadata_json["file_size_bytes"] = file_size_bytes
    metadata_json["upload"] = {
        "original_filename": original_filename,
        "content_type": content_type,
        "uploaded_at": _utcnow_iso(),
    }
    metadata_json["storage"] = {
        "bucket": settings.MINIO_BUCKET,
        "original_object_key": original_object_key,
        "processed_object_keys": {},
    }
    metadata_json["processing"] = {
        "status": "queued",
        "queued_at": _utcnow_iso(),
        "pipeline_version": 1,
    }
    if request_id:
        metadata_json["processing"]["request_id"] = request_id
    return metadata_json


def _assert_uploadable_track(track: Track, current_user: User) -> None:
    if TrackUploadPolicy.can_upload_source(track, current_user):
        return

    if track.status == TrackStatus.processing:
        raise TrackConflictError("Track is already being processed")

    if track.status == TrackStatus.deleted:
        raise TrackConflictError("Deleted tracks cannot accept uploads")

    if track.status == TrackStatus.hidden:
        raise TrackConflictError("Hidden tracks cannot accept uploads")

    raise TrackAccessDeniedError("You can upload only your own tracks")


def _assert_cover_uploadable_track(track: Track, current_user: User) -> None:
    if TrackUploadPolicy.can_upload_cover(track, current_user):
        return

    if track.status == TrackStatus.deleted:
        raise TrackConflictError("Deleted tracks cannot accept cover uploads")

    if track.status == TrackStatus.hidden:
        raise TrackConflictError("Hidden tracks cannot accept cover uploads")

    raise TrackAccessDeniedError("You can upload covers only for your own tracks")


def _hydrate_track(db: Session, track_id: int) -> Track | None:
    return (
        db.query(Track)
        .options(joinedload(Track.user), joinedload(Track.artist), joinedload(Track.category))
        .filter(Track.id == track_id)
        .first()
    )


def create_track_metadata(db: Session, current_user: User, payload: TrackCreate) -> TrackResponse:
    _get_active_category(db, payload.category_id)
    artist = get_required_own_artist_model(db, current_user)

    track = Track(
        user_id=current_user.id,
        artist_id=artist.id,
        title=payload.title,
        description=payload.description,
        genre=payload.genre,
        category_id=payload.category_id,
        is_public=True,
        is_downloadable=payload.is_downloadable,
        license_type=payload.license_type,
        tags=payload.tags,
        bpm=payload.bpm,
        key_signature=payload.key_signature,
        status=TrackStatus.pending,
    )
    db.add(track)
    db.commit()
    db.refresh(track)

    hydrated_track = _hydrate_track(db, track.id)
    return serialize_track(hydrated_track)


def list_user_tracks(db: Session, current_user: User, page: int, size: int) -> PaginatedResponse:
    query = (
        db.query(Track)
        .options(joinedload(Track.user), joinedload(Track.artist), joinedload(Track.category))
        .filter(Track.user_id == current_user.id)
    )
    total = query.order_by(None).count()
    items = (
        query.order_by(Track.created_at.desc(), Track.id.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )

    return PaginatedResponse(
        items=[serialize_track(track, include_private_media=True).model_dump() for track in items],
        total=total,
        page=page,
        size=size,
        pages=ceil(total / size) if total else 0,
    )


def _get_owned_track(db: Session, current_user: User, track_id: int) -> Track:
    track = (
        db.query(Track)
        .options(joinedload(Track.user), joinedload(Track.artist), joinedload(Track.category))
        .filter(Track.id == track_id, Track.user_id == current_user.id)
        .first()
    )
    if track is None:
        raise TrackNotFoundError()

    return track


def update_track_metadata(
    db: Session,
    current_user: User,
    track_id: int,
    payload: TrackUpdate,
) -> TrackResponse:
    track = _get_owned_track(db, current_user, track_id)

    if payload.category_id is not None:
        _get_active_category(db, payload.category_id)

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(track, field, value)

    if track.status == TrackStatus.hidden:
        track.is_public = False
    elif track.status == TrackStatus.rejected:
        track.is_public = True
        track.status = TrackStatus.pending
        track.rejection_reason = None
    else:
        track.is_public = True

    db.add(track)
    db.commit()
    db.refresh(track)
    return serialize_track(track)


def delete_track_metadata(db: Session, current_user: User, track_id: int) -> None:
    track = (
        db.query(Track)
        .options(joinedload(Track.user), joinedload(Track.artist), joinedload(Track.category))
        .filter(Track.id == track_id)
        .first()
    )
    if track is None:
        raise TrackNotFoundError()
    if track.status == TrackStatus.deleted:
        raise TrackConflictError("Deleted tracks cannot be deleted again")
    if not TrackDeletionPolicy.can_delete(track, current_user):
        raise TrackAccessDeniedError("You can delete only your own tracks")

    track.status = TrackStatus.deleted
    track.is_public = False
    db.add(track)
    if is_staff(current_user) and current_user.id != track.user_id:
        db.add(
            AdminLog(
                admin_id=current_user.id,
                action="track_deleted",
                target_type="track",
                target_id=track.id,
                details={
                    "deleted_by_role": current_user.role.value,
                    "owner_id": track.user_id,
                },
            )
        )
    db.commit()
    logger.info(
        "track_deleted",
        track_id=track.id,
        owner_id=track.user_id,
        deleted_by_user_id=current_user.id,
        deleted_by_role=current_user.role.value,
        deleted_by_staff=current_user.id != track.user_id,
    )


def upload_track_source(
    db: Session,
    current_user: User,
    track_id: int,
    upload_file_object: UploadFile,
    request_id: str | None = None,
) -> TrackUploadResponse:
    track = _get_owned_track(db, current_user, track_id)
    _assert_uploadable_track(track, current_user)

    safe_filename, content_type = _validate_upload(upload_file_object)
    previous_state = _snapshot_track_state(track)
    previous_storage_keys = _extract_storage_keys(track.metadata_json if isinstance(track.metadata_json, dict) else None)

    temp_file_path = ""
    new_original_key = ""

    try:
        temp_file_path, file_size_bytes = _write_upload_to_temp_file(
            upload_file_object,
            suffix=Path(safe_filename).suffix.lower(),
            max_file_size=int(settings.MAX_FILE_SIZE),
        )
        new_original_key = build_original_object_key(current_user.id, track.id, safe_filename)
        upload_file(temp_file_path, new_original_key, content_type=content_type)

        stream_urls = _get_track_stream_urls(track.id)
        track.file_size_bytes = file_size_bytes
        track.duration_seconds = None
        track.waveform_data_json = None
        track.original_url = stream_urls["original"]
        track.mp3_128_url = None
        track.mp3_320_url = None
        track.status = TrackStatus.processing
        track.rejection_reason = None
        track.metadata_json = _build_track_upload_metadata(
            current_metadata=track.metadata_json if isinstance(track.metadata_json, dict) else None,
            original_object_key=new_original_key,
            file_size_bytes=file_size_bytes,
            original_filename=safe_filename,
            content_type=content_type,
            request_id=request_id,
        )
        db.add(track)
        db.commit()
        db.refresh(track)

        try:
            task_result = celery_app.send_task(
                "app.tasks.process_track_upload",
                args=[track.id],
                headers={"request_id": request_id} if request_id else {},
            )
        except Exception as exc:
            delete_objects([new_original_key])
            _restore_track_state(track, previous_state)
            db.add(track)
            db.commit()
            db.refresh(track)
            logger.exception(
                "track_upload_queue_unavailable",
                track_id=track.id,
                user_id=current_user.id,
            )
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Upload saved but background processing queue is unavailable",
            ) from exc

        metadata_json = copy.deepcopy(track.metadata_json) if isinstance(track.metadata_json, dict) else {}
        processing = metadata_json.get("processing")
        if not isinstance(processing, dict):
            processing = {}
        processing["status"] = "queued"
        processing["task_id"] = task_result.id
        metadata_json["processing"] = processing
        track.metadata_json = metadata_json
        db.add(track)
        db.commit()
        db.refresh(track)

        delete_objects([key for key in previous_storage_keys if key != new_original_key])
        logger.info(
            "track_upload_queued",
            track_id=track.id,
            user_id=current_user.id,
            task_id=task_result.id,
            request_id=request_id,
            content_type=content_type,
            file_size_bytes=file_size_bytes,
        )

        hydrated_track = _hydrate_track(db, track.id)
        return serialize_track(hydrated_track, include_private_media=True)
    finally:
        try:
            upload_file_object.file.close()
        except Exception:
            pass
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)


def upload_track_cover(
    db: Session,
    current_user: User,
    track_id: int,
    upload_file_object: UploadFile,
) -> TrackUploadResponse:
    track = _get_owned_track(db, current_user, track_id)
    _assert_cover_uploadable_track(track, current_user)

    safe_filename, content_type = _validate_cover_upload(upload_file_object)
    previous_cover_key = _extract_cover_storage_key(track.metadata_json if isinstance(track.metadata_json, dict) else None)
    temp_file_path = ""
    new_cover_key = ""

    try:
        temp_file_path, _ = _write_upload_to_temp_file(
            upload_file_object,
            suffix=Path(safe_filename).suffix.lower(),
            max_file_size=int(settings.MAX_COVER_IMAGE_SIZE),
        )
        new_cover_key = build_cover_object_key(current_user.id, track.id, safe_filename)
        upload_file(temp_file_path, new_cover_key, content_type=content_type)

        metadata_json = copy.deepcopy(track.metadata_json) if isinstance(track.metadata_json, dict) else {}
        metadata_json["cover"] = {
            "object_key": new_cover_key,
            "content_type": content_type,
            "original_filename": safe_filename,
            "uploaded_at": _utcnow_iso(),
        }
        track.metadata_json = metadata_json
        track.cover_image_url = f"{settings.API_PREFIX}/tracks/{track.id}/cover"
        db.add(track)
        db.commit()
        db.refresh(track)

        if previous_cover_key and previous_cover_key != new_cover_key:
            delete_objects([previous_cover_key])
        logger.info(
            "track_cover_uploaded",
            track_id=track.id,
            user_id=current_user.id,
            content_type=content_type,
        )

        hydrated_track = _hydrate_track(db, track.id)
        return serialize_track(hydrated_track, include_private_media=True)
    finally:
        try:
            upload_file_object.file.close()
        except Exception:
            pass
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)
