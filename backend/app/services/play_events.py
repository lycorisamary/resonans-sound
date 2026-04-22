from __future__ import annotations

from datetime import datetime, timedelta, timezone
from hashlib import sha256

from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.metrics import TRACK_PLAY_EVENTS
from app.models import Track, TrackPlayEvent, TrackStatus, User
from app.schemas import TrackPlayResponse
from app.services.rate_limit import get_client_ip


PLAY_DEDUPE_WINDOW_SECONDS = 6 * 60 * 60


def _hash_listener_source(source: str) -> str:
    return sha256(f"{settings.SECRET_KEY}:{source}".encode("utf-8")).hexdigest()


def build_listener_hash(request: Request, current_user: User | None) -> str:
    if current_user is not None:
        return _hash_listener_source(f"user:{current_user.id}")

    client_ip = get_client_ip(request)
    user_agent = (request.headers.get("user-agent") or "").strip()[:500]
    return _hash_listener_source(f"guest:{client_ip}:{user_agent}")


def record_track_play(
    *,
    db: Session,
    track_id: int,
    request: Request,
    current_user: User | None,
) -> TrackPlayResponse:
    listener_hash = build_listener_hash(request=request, current_user=current_user)
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(seconds=PLAY_DEDUPE_WINDOW_SECONDS)

    track = (
        db.query(Track)
        .filter(Track.id == track_id)
        .with_for_update()
        .first()
    )
    if track is None or track.status != TrackStatus.approved:
        TRACK_PLAY_EVENTS.labels(outcome="unavailable").inc()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Track is not available for play counters")

    recent_event = (
        db.query(TrackPlayEvent)
        .filter(
            TrackPlayEvent.track_id == track.id,
            TrackPlayEvent.listener_hash == listener_hash,
            TrackPlayEvent.created_at >= cutoff,
        )
        .order_by(TrackPlayEvent.created_at.desc(), TrackPlayEvent.id.desc())
        .first()
    )

    if recent_event is not None:
        db.commit()
        TRACK_PLAY_EVENTS.labels(outcome="deduped").inc()
        return TrackPlayResponse(
            track_id=track.id,
            counted=False,
            play_count=track.play_count or 0,
            dedupe_window_seconds=PLAY_DEDUPE_WINDOW_SECONDS,
        )

    track.play_count = (track.play_count or 0) + 1
    db.add(
        TrackPlayEvent(
            track_id=track.id,
            user_id=current_user.id if current_user is not None else None,
            listener_hash=listener_hash,
            created_at=now,
        )
    )
    db.add(track)
    db.commit()
    db.refresh(track)

    TRACK_PLAY_EVENTS.labels(outcome="counted").inc()
    return TrackPlayResponse(
        track_id=track.id,
        counted=True,
        play_count=track.play_count or 0,
        dedupe_window_seconds=PLAY_DEDUPE_WINDOW_SECONDS,
    )
