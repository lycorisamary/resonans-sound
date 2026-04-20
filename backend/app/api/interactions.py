from fastapi import APIRouter, Body, Depends, Query
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas import LikeToggleResponse, PaginatedResponse, TrackLikeListResponse
from app.services.interactions import get_liked_track_ids, get_liked_tracks_page, like_track, unlike_track


router = APIRouter()


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
