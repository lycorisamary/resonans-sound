from math import ceil

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models import Category, Track, TrackStatus, User
from app.schemas import PaginatedResponse, TrackCreate, TrackResponse, TrackUpdate
from app.services.catalog import serialize_track


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


def create_track_metadata(db: Session, current_user: User, payload: TrackCreate) -> TrackResponse:
    _get_active_category(db, payload.category_id)

    track = Track(
        user_id=current_user.id,
        title=payload.title,
        description=payload.description,
        genre=payload.genre,
        category_id=payload.category_id,
        is_public=payload.is_public,
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

    hydrated_track = (
        db.query(Track)
        .options(joinedload(Track.user), joinedload(Track.category))
        .filter(Track.id == track.id)
        .first()
    )
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
        items=[serialize_track(track).model_dump() for track in items],
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

    if track.status == TrackStatus.rejected:
        track.status = TrackStatus.pending
        track.rejection_reason = None

    db.add(track)
    db.commit()
    db.refresh(track)
    return serialize_track(track)


def delete_track_metadata(db: Session, current_user: User, track_id: int) -> None:
    track = _get_owned_track(db, current_user, track_id)
    track.status = TrackStatus.deleted
    track.is_public = False
    db.add(track)
    db.commit()
