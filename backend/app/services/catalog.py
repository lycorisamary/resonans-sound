from math import ceil
from typing import Any

from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.models import Category, Track, TrackStatus
from app.schemas import CategoryResponse, PaginatedResponse, TrackMetadata, TrackResponse, TrackUploadResponse, UserPublic


def serialize_user_public(user: Any | None) -> UserPublic | None:
    if user is None:
        return None

    return UserPublic.model_validate(
        {
            "id": user.id,
            "username": user.username,
            "avatar_url": user.avatar_url,
            "bio": user.bio,
            "track_count": 0,
            "follower_count": 0,
            "following_count": 0,
        }
    )


def serialize_category(category: Any | None, track_count: int = 0) -> CategoryResponse | None:
    if category is None:
        return None

    return CategoryResponse.model_validate(
        {
            "id": category.id,
            "name": category.name,
            "slug": category.slug,
            "description": category.description,
            "sort_order": category.sort_order,
            "is_active": category.is_active,
            "created_at": category.created_at,
            "track_count": track_count,
        }
    )


def serialize_track(track: Any, include_private_media: bool = False) -> TrackResponse | TrackUploadResponse:
    metadata = None
    if isinstance(track.metadata_json, dict):
        metadata = TrackMetadata.model_validate(track.metadata_json)

    waveform_data = track.waveform_data_json if isinstance(track.waveform_data_json, dict) else None
    category = None
    if getattr(track, "category", None) is not None and track.category.is_active:
        category = serialize_category(track.category)

    payload = {
        "id": track.id,
        "user_id": track.user_id,
        "title": track.title,
        "description": track.description,
        "genre": track.genre,
        "category_id": track.category_id,
        "status": track.status,
        "created_at": track.created_at,
        "updated_at": track.updated_at or track.created_at,
        "play_count": track.play_count,
        "like_count": track.like_count,
        "comment_count": track.comment_count,
        "duration_seconds": track.duration_seconds,
        "cover_image_url": track.cover_image_url,
        "is_public": track.is_public,
        "is_downloadable": track.is_downloadable,
        "license_type": track.license_type,
        "tags": track.tags,
        "bpm": track.bpm,
        "key_signature": track.key_signature,
        "waveform_data_json": waveform_data,
        "metadata": metadata,
        "user": serialize_user_public(getattr(track, "user", None)),
        "category": category,
    }

    if include_private_media:
        payload.update(
            {
                "original_url": track.original_url,
                "mp3_128_url": track.mp3_128_url,
                "mp3_320_url": track.mp3_320_url,
                "rejection_reason": track.rejection_reason,
            }
        )
        return TrackUploadResponse.model_validate(payload)

    return TrackResponse.model_validate(payload)


def list_public_categories(db: Session) -> list[CategoryResponse]:
    rows = (
        db.query(Category, func.count(Track.id).label("track_count"))
        .outerjoin(
            Track,
            (Track.category_id == Category.id) & (Track.status == TrackStatus.approved),
        )
        .filter(Category.is_active.is_(True))
        .group_by(Category.id)
        .order_by(Category.sort_order.asc(), Category.name.asc())
        .all()
    )

    return [serialize_category(category, track_count) for category, track_count in rows]


def get_public_category(db: Session, slug: str) -> CategoryResponse | None:
    row = (
        db.query(Category, func.count(Track.id).label("track_count"))
        .outerjoin(
            Track,
            (Track.category_id == Category.id) & (Track.status == TrackStatus.approved),
        )
        .filter(Category.slug == slug, Category.is_active.is_(True))
        .group_by(Category.id)
        .first()
    )

    if row is None:
        return None

    category, track_count = row
    return serialize_category(category, track_count)


def build_public_tracks_page(
    db: Session,
    page: int,
    size: int,
    category_slug: str | None = None,
    genre: str | None = None,
    search: str | None = None,
    sort: str = "newest",
) -> PaginatedResponse:
    query = (
        db.query(Track)
        .outerjoin(Category, Track.category_id == Category.id)
        .options(joinedload(Track.user), joinedload(Track.category))
        .filter(
            Track.status == TrackStatus.approved,
            or_(Track.category_id.is_(None), Category.is_active.is_(True)),
        )
    )

    if category_slug:
        query = query.filter(Category.slug == category_slug, Category.is_active.is_(True))

    if genre:
        query = query.filter(Track.genre.ilike(genre.strip()))

    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Track.title.ilike(pattern),
                Track.description.ilike(pattern),
                Track.genre.ilike(pattern),
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
    items = (
        query.order_by(*order_by)
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )

    return PaginatedResponse(
        items=[serialize_track(track).model_dump() for track in items],
        total=total,
        page=page,
        size=size,
        pages=ceil(total / size) if total else 0,
    )


def get_public_track(db: Session, track_id: int) -> TrackResponse | None:
    track = (
        db.query(Track)
        .outerjoin(Category, Track.category_id == Category.id)
        .options(joinedload(Track.user), joinedload(Track.category))
        .filter(
            Track.id == track_id,
            Track.status == TrackStatus.approved,
            or_(Track.category_id.is_(None), Category.is_active.is_(True)),
        )
        .first()
    )

    if track is None:
        return None

    return serialize_track(track)
