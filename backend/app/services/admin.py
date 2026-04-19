from __future__ import annotations

from datetime import datetime, timezone
from math import ceil

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models import AdminLog, Track, TrackStatus, User
from app.schemas import PaginatedResponse, SystemStats, TrackModeration
from app.services.catalog import serialize_track


def _log_admin_action(
    db: Session,
    admin_user: User,
    action: str,
    target_type: str,
    target_id: int,
    details: dict | None = None,
) -> None:
    db.add(
        AdminLog(
            admin_id=admin_user.id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            details=details,
        )
    )


def _get_track_for_moderation(db: Session, track_id: int) -> Track:
    track = (
        db.query(Track)
        .options(joinedload(Track.user), joinedload(Track.category))
        .filter(Track.id == track_id)
        .first()
    )
    if track is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Track not found")
    return track


def _track_has_ready_media(track: Track) -> bool:
    return bool(track.original_url or track.mp3_128_url or track.mp3_320_url)


def _track_is_waiting_for_moderation(track: Track) -> bool:
    return track.status == TrackStatus.pending and _track_has_ready_media(track)


def get_system_stats(db: Session) -> SystemStats:
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    total_users = db.query(func.count(User.id)).scalar() or 0
    total_tracks = db.query(func.count(Track.id)).scalar() or 0
    total_plays = db.query(func.coalesce(func.sum(Track.play_count), 0)).scalar() or 0
    total_likes = db.query(func.coalesce(func.sum(Track.like_count), 0)).scalar() or 0
    active_users_today = (
        db.query(func.count(User.id))
        .filter(User.last_login.is_not(None), User.last_login >= today_start)
        .scalar()
        or 0
    )
    new_users_today = (
        db.query(func.count(User.id))
        .filter(User.created_at >= today_start)
        .scalar()
        or 0
    )
    tracks_pending_moderation = (
        db.query(func.count(Track.id))
        .filter(Track.status == TrackStatus.pending, Track.original_url.is_not(None))
        .scalar()
        or 0
    )

    return SystemStats(
        total_users=total_users,
        total_tracks=total_tracks,
        total_plays=total_plays,
        total_likes=total_likes,
        active_users_today=active_users_today,
        new_users_today=new_users_today,
        tracks_pending_moderation=tracks_pending_moderation,
    )


def get_moderation_queue(db: Session, page: int, size: int) -> PaginatedResponse:
    query = (
        db.query(Track)
        .options(joinedload(Track.user), joinedload(Track.category))
        .filter(Track.status == TrackStatus.pending, Track.original_url.is_not(None))
    )
    total = query.order_by(None).count()
    items = (
        query.order_by(Track.updated_at.desc(), Track.id.desc())
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


def moderate_track(db: Session, admin_user: User, track_id: int, payload: TrackModeration):
    track = _get_track_for_moderation(db, track_id)
    requested_status = payload.status

    if requested_status not in {TrackStatus.approved, TrackStatus.rejected}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Track moderation only supports approved or rejected",
        )

    if track.status == TrackStatus.deleted:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Deleted track cannot be moderated")

    if requested_status == TrackStatus.approved:
        if not _track_is_waiting_for_moderation(track):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Track is not ready for approval",
            )
        track.status = TrackStatus.approved
        track.rejection_reason = None
        action = "track_approved"
    else:
        if not _track_has_ready_media(track):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Track has no uploaded media to reject",
            )
        track.status = TrackStatus.rejected
        track.is_public = False
        track.rejection_reason = payload.rejection_reason or "Rejected during moderation"
        action = "track_rejected"

    db.add(track)
    _log_admin_action(
        db=db,
        admin_user=admin_user,
        action=action,
        target_type="track",
        target_id=track.id,
        details={
            "status": track.status.value,
            "rejection_reason": track.rejection_reason,
        },
    )
    db.commit()
    db.refresh(track)
    return serialize_track(track, include_private_media=True)
