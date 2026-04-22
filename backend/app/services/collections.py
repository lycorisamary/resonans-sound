from __future__ import annotations

import os
from math import ceil
from pathlib import Path
from typing import Any

from fastapi import UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.exceptions import (
    CollectionConflictError,
    CollectionNotFoundError,
    CollectionTrackNotFoundError,
    TrackNotFoundError,
)
from app.models import AdminLog, Collection, CollectionTrack, Track, TrackStatus, User
from app.schemas import (
    CollectionCreate,
    CollectionResponse,
    CollectionTrackAdd,
    CollectionTrackReorder,
    CollectionUpdate,
    PaginatedResponse,
)
from app.services.catalog import serialize_track
from app.services.storage import (
    build_collection_cover_object_key,
    delete_objects,
    get_object_stream,
    stat_object,
    upload_file,
)
from app.services.upload_validation import validate_cover_upload, write_upload_to_temp_file


PUBLIC_COLLECTION_PREVIEW_LIMIT = 4


def _log_collection_action(
    db: Session,
    admin_user: User,
    action: str,
    collection_id: int,
    details: dict | None = None,
) -> None:
    db.add(
        AdminLog(
            admin_id=admin_user.id,
            action=action,
            target_type="collection",
            target_id=collection_id,
            details=details,
        )
    )


def _clean_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _ordered_links(collection: Any) -> list[Any]:
    links = list(getattr(collection, "track_links", []) or [])
    return sorted(
        links,
        key=lambda link: (
            getattr(link, "sort_order", None) if getattr(link, "sort_order", None) is not None else 2**31,
            getattr(link, "id", 0) or 0,
        ),
    )


def _collection_visible_tracks(collection: Any, *, public_only: bool) -> list[Any]:
    tracks = []
    for link in _ordered_links(collection):
        track = getattr(link, "track", None)
        if track is None:
            continue
        if public_only and track.status != TrackStatus.approved:
            continue
        tracks.append(track)
    return tracks


def serialize_collection(
    collection: Any,
    *,
    public_only: bool,
    include_tracks: bool = True,
    preview_limit: int | None = None,
) -> CollectionResponse:
    visible_tracks = _collection_visible_tracks(collection, public_only=public_only)
    response_tracks = visible_tracks
    if preview_limit is not None:
        response_tracks = response_tracks[:preview_limit]

    cover_image_url = getattr(collection, "cover_image_url", None)
    if not cover_image_url:
        cover_image_url = next((track.cover_image_url for track in visible_tracks if track.cover_image_url), None)

    updated_at = getattr(collection, "updated_at", None) or getattr(collection, "created_at", None)
    track_count = len(visible_tracks) if public_only else len(_ordered_links(collection))

    return CollectionResponse.model_validate(
        {
            "id": collection.id,
            "user_id": collection.user_id,
            "name": collection.name,
            "description": collection.description,
            "cover_image_url": cover_image_url,
            "is_public": bool(collection.is_public),
            "track_count": track_count,
            "created_at": collection.created_at,
            "updated_at": updated_at,
            "tracks": [serialize_track(track).model_dump() for track in response_tracks] if include_tracks else [],
        }
    )


def _collection_query(db: Session):
    return db.query(Collection).options(
        joinedload(Collection.track_links).joinedload(CollectionTrack.track).joinedload(Track.user),
        joinedload(Collection.track_links).joinedload(CollectionTrack.track).joinedload(Track.category),
    )


def _public_collection_ids_with_visible_tracks():
    return (
        select(CollectionTrack.playlist_id)
        .join(Track, Track.id == CollectionTrack.track_id)
        .where(Track.status == TrackStatus.approved)
        .group_by(CollectionTrack.playlist_id)
    )


def _get_collection_for_staff(db: Session, collection_id: int) -> Collection:
    collection = _collection_query(db).filter(Collection.id == collection_id).first()
    if collection is None:
        raise CollectionNotFoundError()
    return collection


def _get_track_for_collection(db: Session, track_id: int) -> Track:
    track = (
        db.query(Track)
        .options(joinedload(Track.user), joinedload(Track.category))
        .filter(Track.id == track_id)
        .first()
    )
    if track is None:
        raise TrackNotFoundError()
    if track.status != TrackStatus.approved:
        raise CollectionConflictError("Only approved tracks can be added to collections")
    return track


def _collection_contains_track(db: Session, collection_id: int, track_id: int) -> bool:
    return (
        db.query(CollectionTrack.id)
        .filter(CollectionTrack.playlist_id == collection_id, CollectionTrack.track_id == track_id)
        .first()
        is not None
    )


def _refresh_collection_track_count(db: Session, collection: Collection) -> int:
    track_count = (
        db.query(func.count(CollectionTrack.id))
        .filter(CollectionTrack.playlist_id == collection.id)
        .scalar()
        or 0
    )
    collection.track_count = track_count
    return track_count


def _count_collection_approved_tracks(db: Session, collection_id: int) -> int:
    return (
        db.query(func.count(CollectionTrack.id))
        .join(Track, Track.id == CollectionTrack.track_id)
        .filter(CollectionTrack.playlist_id == collection_id, Track.status == TrackStatus.approved)
        .scalar()
        or 0
    )


def _get_collection_link(db: Session, collection_id: int, track_id: int) -> CollectionTrack:
    link = (
        db.query(CollectionTrack)
        .filter(CollectionTrack.playlist_id == collection_id, CollectionTrack.track_id == track_id)
        .first()
    )
    if link is None:
        raise CollectionTrackNotFoundError()
    return link


def list_public_collections(db: Session, page: int, size: int) -> PaginatedResponse:
    visible_ids = _public_collection_ids_with_visible_tracks()
    query = _collection_query(db).filter(Collection.is_public.is_(True), Collection.id.in_(visible_ids))

    total = query.order_by(None).count()
    items = (
        query.order_by(Collection.created_at.desc(), Collection.id.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )

    return PaginatedResponse(
        items=[
            serialize_collection(
                collection,
                public_only=True,
                include_tracks=True,
                preview_limit=PUBLIC_COLLECTION_PREVIEW_LIMIT,
            ).model_dump()
            for collection in items
        ],
        total=total,
        page=page,
        size=size,
        pages=ceil(total / size) if total else 0,
    )


def get_public_collection(db: Session, collection_id: int) -> CollectionResponse | None:
    visible_ids = _public_collection_ids_with_visible_tracks()
    collection = (
        _collection_query(db)
        .filter(Collection.id == collection_id, Collection.is_public.is_(True), Collection.id.in_(visible_ids))
        .first()
    )
    if collection is None:
        return None
    return serialize_collection(collection, public_only=True, include_tracks=True)


def build_public_collection_cover_response(db: Session, collection_id: int) -> StreamingResponse:
    collection = (
        db.query(Collection)
        .filter(Collection.id == collection_id, Collection.is_public.is_(True))
        .first()
    )
    if collection is None or not collection.cover_storage_key:
        raise CollectionNotFoundError()

    object_info = stat_object(collection.cover_storage_key)
    content_type = object_info.content_type or collection.cover_content_type or "image/jpeg"
    stream = get_object_stream(collection.cover_storage_key)
    return StreamingResponse(
        stream.stream(32 * 1024),
        media_type=content_type,
        headers={
            "Content-Length": str(object_info.size_bytes),
            "Cache-Control": "public, max-age=3600",
        },
    )


def list_admin_collections(db: Session, page: int, size: int, search: str | None = None) -> PaginatedResponse:
    query = _collection_query(db)
    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(Collection.name.ilike(pattern))

    total = query.order_by(None).count()
    items = (
        query.order_by(Collection.created_at.desc(), Collection.id.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )

    return PaginatedResponse(
        items=[serialize_collection(collection, public_only=False, include_tracks=True).model_dump() for collection in items],
        total=total,
        page=page,
        size=size,
        pages=ceil(total / size) if total else 0,
    )


def create_collection(db: Session, admin_user: User, payload: CollectionCreate) -> CollectionResponse:
    if payload.is_public:
        raise CollectionConflictError("Cannot publish an empty collection")

    collection = Collection(
        user_id=admin_user.id,
        name=payload.name.strip(),
        description=_clean_text(payload.description),
        is_public=False,
        track_count=0,
    )
    db.add(collection)
    db.flush()
    _log_collection_action(
        db=db,
        admin_user=admin_user,
        action="collection_created",
        collection_id=collection.id,
        details={"is_public": collection.is_public},
    )
    db.commit()
    return serialize_collection(_get_collection_for_staff(db, collection.id), public_only=False, include_tracks=True)


def update_collection(
    db: Session,
    admin_user: User,
    collection_id: int,
    payload: CollectionUpdate,
) -> CollectionResponse:
    collection = _get_collection_for_staff(db, collection_id)
    changed: dict[str, Any] = {}

    if "name" in payload.model_fields_set and payload.name is not None:
        collection.name = payload.name.strip()
        changed["name"] = collection.name

    if "description" in payload.model_fields_set:
        collection.description = _clean_text(payload.description)
        changed["description"] = collection.description

    if "is_public" in payload.model_fields_set and payload.is_public is not None:
        if payload.is_public and _count_collection_approved_tracks(db, collection.id) < 1:
            raise CollectionConflictError("Cannot publish an empty collection")
        collection.is_public = payload.is_public
        changed["is_public"] = collection.is_public

    _refresh_collection_track_count(db, collection)
    db.add(collection)
    _log_collection_action(
        db=db,
        admin_user=admin_user,
        action="collection_updated",
        collection_id=collection.id,
        details=changed,
    )
    db.commit()
    return serialize_collection(_get_collection_for_staff(db, collection.id), public_only=False, include_tracks=True)


def upload_collection_cover(
    db: Session,
    admin_user: User,
    collection_id: int,
    upload_file_object: UploadFile,
) -> CollectionResponse:
    collection = _get_collection_for_staff(db, collection_id)
    safe_filename, content_type = validate_cover_upload(upload_file_object)
    previous_cover_key = collection.cover_storage_key
    temp_file_path = ""
    new_cover_key = ""

    try:
        temp_file_path, _ = write_upload_to_temp_file(
            upload_file_object,
            suffix=Path(safe_filename).suffix.lower(),
            max_file_size=int(settings.MAX_COVER_IMAGE_SIZE),
        )
        new_cover_key = build_collection_cover_object_key(collection.id, safe_filename)
        upload_file(temp_file_path, new_cover_key, content_type=content_type)

        collection.cover_storage_key = new_cover_key
        collection.cover_content_type = content_type
        collection.cover_image_url = f"{settings.API_PREFIX}/collections/{collection.id}/cover"
        db.add(collection)
        _log_collection_action(
            db=db,
            admin_user=admin_user,
            action="collection_cover_uploaded",
            collection_id=collection.id,
            details={"content_type": content_type},
        )
        db.commit()

        if previous_cover_key and previous_cover_key != new_cover_key:
            delete_objects([previous_cover_key])

        return serialize_collection(_get_collection_for_staff(db, collection.id), public_only=False, include_tracks=True)
    finally:
        try:
            upload_file_object.file.close()
        except Exception:
            pass
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)


def delete_collection(db: Session, admin_user: User, collection_id: int) -> None:
    collection = _get_collection_for_staff(db, collection_id)
    cover_storage_key = collection.cover_storage_key
    _log_collection_action(
        db=db,
        admin_user=admin_user,
        action="collection_deleted",
        collection_id=collection.id,
        details={"name": collection.name, "track_count": collection.track_count or 0},
    )
    db.delete(collection)
    db.commit()
    if cover_storage_key:
        delete_objects([cover_storage_key])


def add_collection_track(
    db: Session,
    admin_user: User,
    collection_id: int,
    payload: CollectionTrackAdd,
) -> CollectionResponse:
    collection = _get_collection_for_staff(db, collection_id)
    track = _get_track_for_collection(db, payload.track_id)

    if _collection_contains_track(db, collection.id, track.id):
        raise CollectionConflictError("Track is already in this collection")

    max_sort_order = (
        db.query(func.coalesce(func.max(CollectionTrack.sort_order), 0))
        .filter(CollectionTrack.playlist_id == collection.id)
        .scalar()
        or 0
    )
    link = CollectionTrack(playlist_id=collection.id, track_id=track.id, sort_order=max_sort_order + 1)
    db.add(link)
    _refresh_collection_track_count(db, collection)
    _log_collection_action(
        db=db,
        admin_user=admin_user,
        action="collection_track_added",
        collection_id=collection.id,
        details={"track_id": track.id},
    )
    db.commit()
    return serialize_collection(_get_collection_for_staff(db, collection.id), public_only=False, include_tracks=True)


def remove_collection_track(
    db: Session,
    admin_user: User,
    collection_id: int,
    track_id: int,
) -> CollectionResponse:
    collection = _get_collection_for_staff(db, collection_id)
    link = _get_collection_link(db, collection.id, track_id)
    db.delete(link)
    db.flush()

    approved_count = _count_collection_approved_tracks(db, collection.id)
    auto_unpublished = False
    if collection.is_public and approved_count < 1:
        collection.is_public = False
        auto_unpublished = True

    _refresh_collection_track_count(db, collection)
    _log_collection_action(
        db=db,
        admin_user=admin_user,
        action="collection_track_removed",
        collection_id=collection.id,
        details={"track_id": track_id, "auto_unpublished": auto_unpublished},
    )
    db.commit()
    return serialize_collection(_get_collection_for_staff(db, collection.id), public_only=False, include_tracks=True)


def reorder_collection_tracks(
    db: Session,
    admin_user: User,
    collection_id: int,
    payload: CollectionTrackReorder,
) -> CollectionResponse:
    collection = _get_collection_for_staff(db, collection_id)
    links = (
        db.query(CollectionTrack)
        .filter(CollectionTrack.playlist_id == collection.id)
        .order_by(CollectionTrack.sort_order.asc(), CollectionTrack.id.asc())
        .all()
    )
    current_track_ids = [link.track_id for link in links]
    requested_track_ids = payload.track_ids
    if set(current_track_ids) != set(requested_track_ids) or len(current_track_ids) != len(requested_track_ids):
        raise CollectionConflictError("Reorder payload must include every collection track exactly once")

    links_by_track_id = {link.track_id: link for link in links}
    for index, track_id in enumerate(requested_track_ids, start=1):
        links_by_track_id[track_id].sort_order = index
        db.add(links_by_track_id[track_id])

    _log_collection_action(
        db=db,
        admin_user=admin_user,
        action="collection_tracks_reordered",
        collection_id=collection.id,
        details={"track_ids": requested_track_ids},
    )
    db.commit()
    return serialize_collection(_get_collection_for_staff(db, collection.id), public_only=False, include_tracks=True)
