from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.security import get_moderator_user
from app.db.session import get_db
from app.models import User
from app.schemas import PaginatedResponse, SystemStats, TrackModeration, TrackUploadResponse
from app.services.admin import get_moderation_queue, get_system_stats, list_admin_logs, moderate_track


router = APIRouter()


@router.get("/stats", response_model=SystemStats)
def admin_stats(
    current_user: User = Depends(get_moderator_user),
    db: Session = Depends(get_db),
) -> SystemStats:
    """Return lightweight moderation/system stats for moderators and admins."""
    return get_system_stats(db)


@router.get("/moderation", response_model=PaginatedResponse)
def moderation_queue(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_moderator_user),
    db: Session = Depends(get_db),
) -> PaginatedResponse:
    """Return tracks waiting for approval after media processing."""
    return get_moderation_queue(db, page=page, size=size)


@router.get("/logs", response_model=PaginatedResponse)
def admin_logs(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    target_type: str | None = Query(None, min_length=1, max_length=50),
    current_user: User = Depends(get_moderator_user),
    db: Session = Depends(get_db),
) -> PaginatedResponse:
    """Return recent moderation/admin actions for audit visibility."""
    return list_admin_logs(db=db, page=page, size=size, target_type=target_type)


@router.post("/moderate/{track_id}", response_model=TrackUploadResponse)
def moderate_track_endpoint(
    track_id: int,
    payload: TrackModeration,
    current_user: User = Depends(get_moderator_user),
    db: Session = Depends(get_db),
) -> TrackUploadResponse:
    """Approve or reject a track as moderator/admin."""
    return moderate_track(db=db, admin_user=current_user, track_id=track_id, payload=payload)
