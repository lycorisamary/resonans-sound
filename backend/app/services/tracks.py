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
from app.models import AdminLog, Category, Track, TrackStatus, User, UserRole
from app.schemas import PaginatedResponse, TrackCreate, TrackResponse, TrackUpdate, TrackUploadResponse
from app.services.catalog import serialize_track
from app.services.storage import (
    build_cover_object_key,
    build_original_object_key,
    delete_objects,
    guess_content_type,
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


def _is_staff(user: User) -> bool:
    return user.role in {UserRole.admin, UserRole.moderator}


def _can_delete_track(track: Track, current_user: User) -> bool:
    return current_user.id == track.user_id or _is_staff(current_user)


def _detect_upload_content_type(upload_file_object: UploadFile, extension: str) -> str:
    provided_content_type = upload_file_object.content_type
    guessed_content_type = guess_content_type(upload_file_object.filename)
    allowed_content_types = set(settings.ALLOWED_AUDIO_FORMATS)

    if provided_content_type in allowed_content_types:
        return provided_content_type

    if guessed_content_type in allowed_content_types:
        return guessed_content_type

    if extension == ".mp3":
        return "audio/mpeg"

    if extension == ".wav":
        return "audio/wav"

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Unsupported audio content type",
    )


def _validate_upload(upload_file_object: UploadFile) -> tuple[str, str]:
    safe_filename = sanitize_filename(upload_file_object.filename)
    extension = Path(safe_filename).suffix.lower()

    if extension not in set(settings.ALLOWED_EXTENSIONS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported audio file extension",
        )

    content_type = _detect_upload_content_type(upload_file_object, extension)
    return safe_filename, content_type


def _validate_cover_upload(upload_file_object: UploadFile) -> tuple[str, str]:
    safe_filename = sanitize_filename(upload_file_object.filename)
    extension = Path(safe_filename).suffix.lower()

    if extension not in set(settings.ALLOWED_IMAGE_EXTENSIONS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported cover image extension",
        )

    provided_content_type = upload_file_object.content_type
    guessed_content_type = guess_content_type(upload_file_object.filename)
    allowed_content_types = set(settings.ALLOWED_IMAGE_FORMATS)

    if provided_content_type in allowed_content_types:
        return safe_filename, provided_content_type

    if guessed_content_type in allowed_content_types:
        return safe_filename, guessed_content_type

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Unsupported cover image content type",
    )


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
    return metadata_json


def _assert_uploadable_track(track: Track) -> None:
    if track.status == TrackStatus.processing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Track is already being processed",
        )

    if track.status == TrackStatus.deleted:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Deleted tracks cannot accept uploads",
        )


def _assert_cover_uploadable_track(track: Track) -> None:
    if track.status == TrackStatus.deleted:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Deleted tracks cannot accept cover uploads",
        )


def _hydrate_track(db: Session, track_id: int) -> Track | None:
    return (
        db.query(Track)
        .options(joinedload(Track.user), joinedload(Track.category))
        .filter(Track.id == track_id)
        .first()
    )


def create_track_metadata(db: Session, current_user: User, payload: TrackCreate) -> TrackResponse:
    _get_active_category(db, payload.category_id)

    track = Track(
        user_id=current_user.id,
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
        .options(joinedload(Track.user), joinedload(Track.category))
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
        .options(joinedload(Track.user), joinedload(Track.category))
        .filter(Track.id == track_id, Track.user_id == current_user.id)
        .first()
    )
    if track is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Track not found")

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

    track.is_public = True
    if track.status == TrackStatus.rejected:
        track.status = TrackStatus.pending
        track.rejection_reason = None

    db.add(track)
    db.commit()
    db.refresh(track)
    return serialize_track(track)


def delete_track_metadata(db: Session, current_user: User, track_id: int) -> None:
    track = (
        db.query(Track)
        .options(joinedload(Track.user), joinedload(Track.category))
        .filter(Track.id == track_id)
        .first()
    )
    if track is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Track not found")
    if not _can_delete_track(track, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can delete only your own tracks")

    track.status = TrackStatus.deleted
    track.is_public = False
    db.add(track)
    if _is_staff(current_user) and current_user.id != track.user_id:
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
) -> TrackUploadResponse:
    track = _get_owned_track(db, current_user, track_id)
    _assert_uploadable_track(track)

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
        )
        db.add(track)
        db.commit()
        db.refresh(track)

        try:
            task_result = celery_app.send_task("app.tasks.process_track_upload", args=[track.id])
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
    _assert_cover_uploadable_track(track)

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
