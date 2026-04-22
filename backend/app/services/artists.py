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
from app.exceptions import ArtistConflictError, ArtistNotFoundError
from app.models import Artist, Category, Track, TrackStatus, User, UserStatus
from app.schemas import ArtistProfileCreate, ArtistProfileResponse, ArtistProfileUpdate, PaginatedResponse
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


def _profile_genres(artist: Any) -> list[str]:
    genres = getattr(artist, "profile_genres", None)
    return genres if isinstance(genres, list) else []


def _profile_links(artist: Any, field: str) -> dict[str, str]:
    links = getattr(artist, field, None)
    return links if isinstance(links, dict) else {}


def _artist_stats_query(db: Session):
    return (
        db.query(
            Artist,
            func.count(Track.id).label("track_count"),
            func.coalesce(func.sum(Track.play_count), 0).label("play_count"),
            func.coalesce(func.sum(Track.like_count), 0).label("like_count"),
        )
        .join(User, User.id == Artist.user_id)
        .outerjoin(Track, (Track.artist_id == Artist.id) & (Track.status == TrackStatus.approved))
        .filter(User.status == UserStatus.active, Artist.is_public.is_(True))
        .group_by(Artist.id, User.id)
    )


def serialize_artist_profile(artist: Any, track_count: int = 0, play_count: int = 0, like_count: int = 0) -> ArtistProfileResponse:
    user = getattr(artist, "user", None)
    return ArtistProfileResponse.model_validate(
        {
            "id": artist.id,
            "user_id": artist.user_id,
            "slug": artist.slug,
            "username": user.username if user is not None else artist.slug,
            "display_name": artist.display_name,
            "avatar_url": artist.avatar_url,
            "banner_image_url": artist.banner_image_url,
            "bio": artist.bio,
            "location": artist.location,
            "profile_genres": _profile_genres(artist),
            "social_links": _profile_links(artist, "social_links"),
            "streaming_links": _profile_links(artist, "streaming_links"),
            "track_count": track_count,
            "play_count": play_count,
            "like_count": like_count,
            "created_at": artist.created_at,
        }
    )


def list_public_artists(db: Session, page: int, size: int, search: str | None = None) -> PaginatedResponse:
    query = _artist_stats_query(db)
    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Artist.slug.ilike(pattern),
                Artist.display_name.ilike(pattern),
                Artist.bio.ilike(pattern),
            )
        )

    total = query.order_by(None).count()
    rows = (
        query.order_by(
            func.count(Track.id).desc(),
            func.coalesce(func.sum(Track.play_count), 0).desc(),
            Artist.created_at.desc(),
            Artist.id.desc(),
        )
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )

    return PaginatedResponse(
        items=[
            serialize_artist_profile(
                artist=artist,
                track_count=track_count or 0,
                play_count=play_count or 0,
                like_count=like_count or 0,
            ).model_dump()
            for artist, track_count, play_count, like_count in rows
        ],
        total=total,
        page=page,
        size=size,
        pages=ceil(total / size) if total else 0,
    )


def get_public_artist(db: Session, username: str) -> ArtistProfileResponse:
    row = (
        _artist_stats_query(db)
        .filter(func.lower(Artist.slug) == username.strip().lower())
        .first()
    )
    if row is None:
        raise ArtistNotFoundError()

    artist, track_count, play_count, like_count = row
    return serialize_artist_profile(
        artist=artist,
        track_count=track_count or 0,
        play_count=play_count or 0,
        like_count=like_count or 0,
    )


def list_artist_tracks(db: Session, username: str, page: int, size: int, sort: str = "newest") -> PaginatedResponse:
    artist = (
        db.query(Artist)
        .join(User, User.id == Artist.user_id)
        .filter(func.lower(Artist.slug) == username.strip().lower(), Artist.is_public.is_(True), User.status == UserStatus.active)
        .first()
    )
    if artist is None:
        raise ArtistNotFoundError()

    query = (
        db.query(Track)
        .outerjoin(Category, Track.category_id == Category.id)
        .options(joinedload(Track.user), joinedload(Track.artist), joinedload(Track.category))
        .filter(
            Track.artist_id == artist.id,
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


def get_own_artist(db: Session, current_user: User) -> ArtistProfileResponse | None:
    artist = db.query(Artist).filter(Artist.user_id == current_user.id).first()
    if artist is None:
        return None
    artist.user = current_user
    return serialize_artist_profile(artist)


def get_required_own_artist_model(db: Session, current_user: User) -> Artist:
    artist = db.query(Artist).filter(Artist.user_id == current_user.id).first()
    if artist is None:
        raise ArtistConflictError("Create an artist profile before uploading tracks")
    return artist


def create_own_artist_profile(db: Session, current_user: User, payload: ArtistProfileCreate) -> ArtistProfileResponse:
    existing = db.query(Artist).filter(Artist.user_id == current_user.id).first()
    if existing is not None:
        raise ArtistConflictError("User already has an artist profile")

    slug_exists = db.query(Artist.id).filter(func.lower(Artist.slug) == payload.slug.lower()).first()
    if slug_exists is not None:
        raise ArtistConflictError("Artist slug is already taken")

    artist = Artist(
        user_id=current_user.id,
        slug=payload.slug,
        display_name=payload.display_name,
        bio=payload.bio,
        location=payload.location,
        profile_genres=payload.profile_genres,
        social_links=payload.social_links,
        streaming_links=payload.streaming_links,
        is_public=True,
    )
    db.add(artist)
    db.commit()
    db.refresh(artist)
    artist.user = current_user
    return serialize_artist_profile(artist)


def update_own_artist_profile(db: Session, current_user: User, payload: ArtistProfileUpdate) -> ArtistProfileResponse:
    artist = get_required_own_artist_model(db, current_user)
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        if field == "slug":
            continue
        setattr(artist, field, value)

    db.add(artist)
    db.commit()
    db.refresh(artist)
    artist.user = current_user
    return serialize_artist_profile(artist)


def upload_own_profile_image(
    db: Session,
    current_user: User,
    upload_file_object: UploadFile,
    image_kind: str,
) -> ArtistProfileResponse:
    if image_kind not in PROFILE_IMAGE_KINDS:
        raise ArtistNotFoundError("Profile image kind not found")

    safe_filename, content_type = validate_cover_upload(upload_file_object)
    artist = get_required_own_artist_model(db, current_user)
    storage_field = f"{image_kind}_storage_key"
    content_type_field = f"{image_kind}_content_type"
    url_field = "avatar_url" if image_kind == "avatar" else "banner_image_url"
    previous_key = getattr(artist, storage_field)
    temp_file_path = ""
    new_key = ""

    try:
        temp_file_path, _ = write_upload_to_temp_file(
            upload_file_object,
            suffix=Path(safe_filename).suffix.lower(),
            max_file_size=int(settings.MAX_COVER_IMAGE_SIZE),
        )
        new_key = build_profile_image_object_key(artist.id, image_kind, safe_filename)
        upload_file(temp_file_path, new_key, content_type=content_type)

        setattr(artist, storage_field, new_key)
        setattr(artist, content_type_field, content_type)
        setattr(artist, url_field, f"{settings.API_PREFIX}/artists/{artist.slug}/{image_kind}")
        db.add(artist)
        db.commit()
        db.refresh(artist)

        if previous_key and previous_key != new_key:
            delete_objects([previous_key])

        artist.user = current_user
        return serialize_artist_profile(artist)
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

    artist = (
        db.query(Artist)
        .join(User, User.id == Artist.user_id)
        .filter(func.lower(Artist.slug) == username.strip().lower(), Artist.is_public.is_(True), User.status == UserStatus.active)
        .first()
    )
    if artist is None:
        raise ArtistNotFoundError()

    storage_key = getattr(artist, f"{image_kind}_storage_key")
    if not storage_key:
        raise ArtistNotFoundError("Artist image not found")

    object_info = stat_object(storage_key)
    content_type = object_info.content_type or getattr(artist, f"{image_kind}_content_type") or "image/jpeg"
    stream = get_object_stream(storage_key)
    return StreamingResponse(
        stream.stream(32 * 1024),
        media_type=content_type,
        headers={
            "Content-Length": str(object_info.size_bytes),
            "Cache-Control": "public, max-age=3600",
        },
    )
