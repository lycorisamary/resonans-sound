from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Interaction, InteractionType, Track, TrackStatus, User
from app.schemas import LikeToggleResponse, TrackLikeListResponse


def _get_likeable_track(db: Session, track_id: int) -> Track:
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
            Track.is_public.is_(True),
        )
        .all()
    )
    return TrackLikeListResponse(track_ids=[track_id for (track_id,) in rows if track_id is not None])
