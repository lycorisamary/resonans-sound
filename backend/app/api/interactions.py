from fastapi import APIRouter, Body, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_current_user, get_optional_current_user
from app.db.session import get_db
from app.models import User
from app.schemas import (
    LikeToggleResponse,
    PaginatedResponse,
    TrackLikeListResponse,
    TrackPlayCreate,
    TrackPlayResponse,
    TrackReportCreate,
    TrackReportResponse,
)
from app.services.interactions import get_liked_track_ids, get_liked_tracks_page, like_track, unlike_track
from app.services.play_events import record_track_play
from app.services.rate_limit import RateLimit, enforce_rate_limit, user_or_ip_subject
from app.services.reports import create_track_report


router = APIRouter()


@router.post("/reports/track", response_model=TrackReportResponse, status_code=201)
def report_track_endpoint(
    payload: TrackReportCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TrackReportResponse:
    """Submit a post-publication report for a published track."""
    enforce_rate_limit(
        request=request,
        scope="track_report",
        subject=user_or_ip_subject(request, current_user.id),
        limit=RateLimit(settings.REPORT_RATE_LIMIT_PER_HOUR, 60 * 60),
    )
    return create_track_report(db=db, current_user=current_user, payload=payload)


@router.post("/play", response_model=TrackPlayResponse)
def record_play_endpoint(
    payload: TrackPlayCreate,
    request: Request,
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> TrackPlayResponse:
    """Record a listen-threshold play event for a published track."""
    enforce_rate_limit(
        request=request,
        scope="track_play_event",
        subject=user_or_ip_subject(request, current_user.id if current_user else None),
        limit=RateLimit(settings.PLAY_EVENT_RATE_LIMIT_PER_MINUTE, 60),
    )
    return record_track_play(db=db, track_id=payload.track_id, request=request, current_user=current_user)


@router.get("/likes/mine", response_model=TrackLikeListResponse)
def my_likes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TrackLikeListResponse:
    """Return published track ids liked by the current user."""
    return get_liked_track_ids(db=db, current_user=current_user)


@router.get("/likes/mine/tracks", response_model=PaginatedResponse)
def my_liked_tracks(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaginatedResponse:
    """Return full track cards for the current user's liked tracks."""
    return get_liked_tracks_page(db=db, current_user=current_user, page=page, size=size)


@router.post("/like", response_model=LikeToggleResponse)
def like_track_endpoint(
    track_id: int = Body(..., embed=True, gt=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LikeToggleResponse:
    """Like a published track."""
    return like_track(db=db, current_user=current_user, track_id=track_id)


@router.delete("/like", response_model=LikeToggleResponse)
def unlike_track_endpoint(
    track_id: int = Query(..., gt=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LikeToggleResponse:
    """Remove a like from a published track."""
    return unlike_track(db=db, current_user=current_user, track_id=track_id)
