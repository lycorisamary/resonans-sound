from fastapi import APIRouter, Body, Depends, Query
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas import LikeToggleResponse, TrackLikeListResponse
from app.services.interactions import get_liked_track_ids, like_track, unlike_track


router = APIRouter()


@router.get("/likes/mine", response_model=TrackLikeListResponse)
def my_likes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TrackLikeListResponse:
    """Return approved public track ids liked by the current user."""
    return get_liked_track_ids(db=db, current_user=current_user)


@router.post("/like", response_model=LikeToggleResponse)
def like_track_endpoint(
    track_id: int = Body(..., embed=True, gt=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LikeToggleResponse:
    """Like an approved public track."""
    return like_track(db=db, current_user=current_user, track_id=track_id)


@router.delete("/like", response_model=LikeToggleResponse)
def unlike_track_endpoint(
    track_id: int = Query(..., gt=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LikeToggleResponse:
    """Remove a like from an approved public track."""
    return unlike_track(db=db, current_user=current_user, track_id=track_id)
