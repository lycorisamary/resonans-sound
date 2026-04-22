from __future__ import annotations

import os
from math import ceil
from pathlib import Path
from typing import Any

from fastapi import UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.exceptions import ArtistNotFoundError
from app.models import Category, Track, TrackStatus, User, UserStatus
from app.schemas import ArtistProfileResponse, ArtistProfileUpdate, PaginatedResponse
from app.services.catalog import serialize_track
from app.services.storage import (
    build_profile_image_object_key,
    delete_objects,
    get_object_stream,
    stat_object,
    upload_file,
)
from app.services.upload_validation import validate_cover_upload, write_upload_to_temp_file


PROFILE_IMAGE_KINDS = {"avatar", "banner"}


def _profile_genres(user: Any) -> list[str]:
    genres = getattr(user, "profile_genres", None)
    return genres if isinstance(genres, list) else []


def _profile_links(user: Any, field: str) -> dict[str, str]:
    links = getattr(user, field, None)
    return links if isinstance(links, dict) else {}


def _artist_stats_query(db: Session):
    return (
        db.query(
            User,
            func.count(Track.id).label("track_count"),
            func.coalesce(func.sum(Track.play_count), 0).label("play_count"),
            func.coalesce(func.sum(Track.like_count), 0).label("like_count"),
        )
        .outerjoin(Track, (Track.user_id == User.id) & (Track.status == TrackStatus.approved))
        .filter(User.status == UserStatus.active)
        .group_by(User.id)
    )


def serialize_artist_profile(user: Any, track_count: int = 0, play_count: int = 0, like_count: int = 0) -> ArtistProfileResponse:
    return ArtistProfileResponse.model_validate(
        {
            "id": user.id,
            "username": user.username,
            "display_name": user.display_name,
            "avatar_url": user.avatar_url,
            "banner_image_url": user.banner_image_url,
            "bio": user.bio,
            "location": user.location,
            "profile_genres": _profile_genres(user),
            "social_links": _profile_links(user, "social_links"),
            "streaming_links": _profile_links(user, "streaming_links"),
            "track_count": track_count,
            "play_count": play_count,
            "like_count": like_count,
            "created_at": user.created_at,
        }
    )


def list_public_artists(db: Session, page: int, size: int, search: str | None = None) -> PaginatedResponse:
    query = _artist_stats_query(db)
    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                User.username.ilike(pattern),
                User.display_name.ilike(pattern),
                User.bio.ilike(pattern),
            )
        )

    total = query.order_by(None).count()
    rows = (
        query.order_by(
            func.count(Track.id).desc(),
            func.coalesce(func.sum(Track.play_count), 0).desc(),
            User.created_at.desc(),
            User.id.desc(),
        )
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )

    return PaginatedResponse(
        items=[
            serialize_artist_profile(
                user=user,
                track_count=track_count or 0,
                play_count=play_count or 0,
                like_count=like_count or 0,
            ).model_dump()
            for user, track_count, play_count, like_count in rows
        ],
        total=total,
        page=page,
        size=size,
        pages=ceil(total / size) if total else 0,
    )


def get_public_artist(db: Session, username: str) -> ArtistProfileResponse:
    row = (
        _artist_stats_query(db)
        .filter(func.lower(User.username) == username.strip().lower())
        .first()
    )
    if row is None:
        raise ArtistNotFoundError()

    user, track_count, play_count, like_count = row
    return serialize_artist_profile(
        user=user,
        track_count=track_count or 0,
        play_count=play_count or 0,
        like_count=like_count or 0,
    )


def list_artist_tracks(db: Session, username: str, page: int, size: int, sort: str = "newest") -> PaginatedResponse:
    artist = (
        db.query(User)
        .filter(func.lower(User.username) == username.strip().lower(), User.status == UserStatus.active)
        .first()
    )
    if artist is None:
        raise ArtistNotFoundError()

    query = (
        db.query(Track)
        .outerjoin(Category, Track.category_id == Category.id)
        .options(joinedload(Track.user), joinedload(Track.category))
        .filter(
            Track.user_id == artist.id,
            Track.status == TrackStatus.approved,
            or_(Track.category_id.is_(None), Category.is_active.is_(True)),
        )
    )

    sort_key = sort.strip().lower() if sort else "newest"
    if sort_key == "popular":
        order_by = [Track.play_count.desc(), Track.like_count.desc(), Track.created_at.desc(), Track.id.desc()]
    elif sort_key == "title":
        order_by = [func.lower(Track.title).asc(), Track.id.desc()]
    else:
        order_by = [Track.created_at.desc(), Track.id.desc()]

    total = query.order_by(None).count()
    items = query.order_by(*order_by).offset((page - 1) * size).limit(size).all()
    return PaginatedResponse(
        items=[serialize_track(track).model_dump() for track in items],
        total=total,
        page=page,
        size=size,
        pages=ceil(total / size) if total else 0,
    )


def update_own_artist_profile(db: Session, current_user: User, payload: ArtistProfileUpdate) -> ArtistProfileResponse:
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(current_user, field, value)

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return get_public_artist(db, current_user.username)


def upload_own_profile_image(
    db: Session,
    current_user: User,
    upload_file_object: UploadFile,
    image_kind: str,
) -> ArtistProfileResponse:
    if image_kind not in PROFILE_IMAGE_KINDS:
        raise ArtistNotFoundError("Profile image kind not found")

    safe_filename, content_type = validate_cover_upload(upload_file_object)
    storage_field = f"{image_kind}_storage_key"
    content_type_field = f"{image_kind}_content_type"
    url_field = "avatar_url" if image_kind == "avatar" else "banner_image_url"
    previous_key = getattr(current_user, storage_field)
    temp_file_path = ""
    new_key = ""

    try:
        temp_file_path, _ = write_upload_to_temp_file(
            upload_file_object,
            suffix=Path(safe_filename).suffix.lower(),
            max_file_size=int(settings.MAX_COVER_IMAGE_SIZE),
        )
        new_key = build_profile_image_object_key(current_user.id, image_kind, safe_filename)
        upload_file(temp_file_path, new_key, content_type=content_type)

        setattr(current_user, storage_field, new_key)
        setattr(current_user, content_type_field, content_type)
        setattr(current_user, url_field, f"{settings.API_PREFIX}/artists/{current_user.username}/{image_kind}")
        db.add(current_user)
        db.commit()
        db.refresh(current_user)

        if previous_key and previous_key != new_key:
            delete_objects([previous_key])

        return get_public_artist(db, current_user.username)
    finally:
        try:
            upload_file_object.file.close()
        except Exception:
            pass
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)


def build_public_profile_image_response(db: Session, username: str, image_kind: str) -> StreamingResponse:
    if image_kind not in PROFILE_IMAGE_KINDS:
        raise ArtistNotFoundError()

    user = (
        db.query(User)
        .filter(func.lower(User.username) == username.strip().lower(), User.status == UserStatus.active)
        .first()
    )
    if user is None:
        raise ArtistNotFoundError()

    storage_key = getattr(user, f"{image_kind}_storage_key")
    if not storage_key:
        raise ArtistNotFoundError("Artist image not found")

    object_info = stat_object(storage_key)
    content_type = object_info.content_type or getattr(user, f"{image_kind}_content_type") or "image/jpeg"
    stream = get_object_stream(storage_key)
    return StreamingResponse(
        stream.stream(32 * 1024),
        media_type=content_type,
        headers={
            "Content-Length": str(object_info.size_bytes),
            "Cache-Control": "public, max-age=3600",
        },
    )
