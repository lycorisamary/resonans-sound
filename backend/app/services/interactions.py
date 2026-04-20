from __future__ import annotations

from math import ceil

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models import Interaction, InteractionType, Track, TrackStatus, User
from app.schemas import LikeToggleResponse, PaginatedResponse, TrackLikeListResponse
from app.services.catalog import serialize_track


def _ordered_unique_track_ids(rows: list[tuple[int | None]]) -> list[int]:
    ordered_track_ids: list[int] = []
    seen_track_ids: set[int] = set()

    for (track_id,) in rows:
        if track_id is None or track_id in seen_track_ids:
            continue
        seen_track_ids.add(track_id)
        ordered_track_ids.append(track_id)

    return ordered_track_ids


def _get_likeable_track(db: Session, track_id: int) -> Track:
    track = (
        db.query(Track)
        .filter(
            Track.id == track_id,
            Track.status == TrackStatus.approved,
        )
        .first()
    )
    if track is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Track is not available for likes")
    return track


def like_track(db: Session, current_user: User, track_id: int) -> LikeToggleResponse:
    track = _get_likeable_track(db, track_id)
    interaction = (
        db.query(Interaction)
        .filter(
            Interaction.user_id == current_user.id,
            Interaction.track_id == track.id,
            Interaction.type == InteractionType.like,
        )
        .order_by(Interaction.id.desc())
        .first()
    )

    if interaction and not interaction.is_deleted:
        return LikeToggleResponse(track_id=track.id, liked=True, like_count=track.like_count or 0)

    if interaction is None:
        interaction = Interaction(
            user_id=current_user.id,
            track_id=track.id,
            type=InteractionType.like,
            is_deleted=False,
        )
    else:
        interaction.is_deleted = False

    track.like_count = max(0, (track.like_count or 0) + 1)
    db.add(interaction)
    db.add(track)
    db.commit()
    db.refresh(track)

    return LikeToggleResponse(track_id=track.id, liked=True, like_count=track.like_count or 0)


def unlike_track(db: Session, current_user: User, track_id: int) -> LikeToggleResponse:
    track = _get_likeable_track(db, track_id)
    interaction = (
        db.query(Interaction)
        .filter(
            Interaction.user_id == current_user.id,
            Interaction.track_id == track.id,
            Interaction.type == InteractionType.like,
            Interaction.is_deleted.is_(False),
        )
        .order_by(Interaction.id.desc())
        .first()
    )

    if interaction is None:
        return LikeToggleResponse(track_id=track.id, liked=False, like_count=track.like_count or 0)

    interaction.is_deleted = True
    track.like_count = max(0, (track.like_count or 0) - 1)
    db.add(interaction)
    db.add(track)
    db.commit()
    db.refresh(track)

    return LikeToggleResponse(track_id=track.id, liked=False, like_count=track.like_count or 0)


def get_liked_track_ids(db: Session, current_user: User) -> TrackLikeListResponse:
    rows = (
        db.query(Interaction.track_id)
        .join(Track, Track.id == Interaction.track_id)
        .filter(
            Interaction.user_id == current_user.id,
            Interaction.type == InteractionType.like,
            Interaction.is_deleted.is_(False),
            Track.status == TrackStatus.approved,
        )
        .order_by(Interaction.updated_at.desc(), Interaction.id.desc())
        .all()
    )
    return TrackLikeListResponse(track_ids=_ordered_unique_track_ids(rows))


def get_liked_tracks_page(db: Session, current_user: User, page: int, size: int) -> PaginatedResponse:
    liked_rows = (
        db.query(Interaction.track_id)
        .join(Track, Track.id == Interaction.track_id)
        .filter(
            Interaction.user_id == current_user.id,
            Interaction.type == InteractionType.like,
            Interaction.is_deleted.is_(False),
            Track.status == TrackStatus.approved,
        )
        .order_by(Interaction.updated_at.desc(), Interaction.id.desc())
        .all()
    )

    ordered_track_ids = _ordered_unique_track_ids(liked_rows)
    total = len(ordered_track_ids)
    page_track_ids = ordered_track_ids[(page - 1) * size: page * size]
    if not page_track_ids:
        return PaginatedResponse(items=[], total=total, page=page, size=size, pages=ceil(total / size) if total else 0)

    tracks = (
        db.query(Track)
        .options(joinedload(Track.user), joinedload(Track.category))
        .filter(
            Track.id.in_(page_track_ids),
            Track.status == TrackStatus.approved,
        )
        .all()
    )
    tracks_by_id = {track.id: track for track in tracks}
    items = [tracks_by_id[track_id] for track_id in page_track_ids if track_id in tracks_by_id]

    return PaginatedResponse(
        items=[serialize_track(track).model_dump() for track in items],
        total=total,
        page=page,
        size=size,
        pages=ceil(total / size) if total else 0,
    )
