from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.security import get_moderator_user
from app.db.session import get_db
from app.models import User
from app.schemas import (
    CollectionCreate,
    CollectionResponse,
    CollectionTrackAdd,
    CollectionTrackReorder,
    CollectionUpdate,
    PaginatedResponse,
    SystemStats,
    TrackModeration,
    TrackStatusEnum,
    TrackUploadResponse,
)
from app.services.admin import get_moderation_queue, get_system_stats, list_admin_logs, moderate_track
from app.services.collections import (
    add_collection_track,
    create_collection,
    delete_collection,
    list_admin_collections,
    remove_collection_track,
    reorder_collection_tracks,
    update_collection,
)


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
    status: TrackStatusEnum | None = Query(None),
    search: str | None = Query(None, min_length=1, max_length=255),
    current_user: User = Depends(get_moderator_user),
    db: Session = Depends(get_db),
) -> PaginatedResponse:
    """Return recent tracks for staff review and visibility control."""
    return get_moderation_queue(db, page=page, size=size, status_filter=status, search=search)


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
    """Approve, hide, or reject a track as moderator/admin."""
    return moderate_track(db=db, admin_user=current_user, track_id=track_id, payload=payload)


@router.get("/collections", response_model=PaginatedResponse)
def admin_collections(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, min_length=1, max_length=255),
    current_user: User = Depends(get_moderator_user),
    db: Session = Depends(get_db),
) -> PaginatedResponse:
    """Return staff-managed collections, including drafts."""
    return list_admin_collections(db=db, page=page, size=size, search=search)


@router.post("/collections", response_model=CollectionResponse, status_code=201)
def create_collection_endpoint(
    payload: CollectionCreate,
    current_user: User = Depends(get_moderator_user),
    db: Session = Depends(get_db),
) -> CollectionResponse:
    """Create a draft staff-managed collection."""
    return create_collection(db=db, admin_user=current_user, payload=payload)


@router.put("/collections/{collection_id}", response_model=CollectionResponse)
def update_collection_endpoint(
    collection_id: int,
    payload: CollectionUpdate,
    current_user: User = Depends(get_moderator_user),
    db: Session = Depends(get_db),
) -> CollectionResponse:
    """Update a staff-managed collection and publish only when it has approved tracks."""
    return update_collection(db=db, admin_user=current_user, collection_id=collection_id, payload=payload)


@router.delete("/collections/{collection_id}")
def delete_collection_endpoint(
    collection_id: int,
    current_user: User = Depends(get_moderator_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Delete a staff-managed collection."""
    delete_collection(db=db, admin_user=current_user, collection_id=collection_id)
    return {"detail": "Collection deleted"}


@router.post("/collections/{collection_id}/tracks", response_model=CollectionResponse)
def add_collection_track_endpoint(
    collection_id: int,
    payload: CollectionTrackAdd,
    current_user: User = Depends(get_moderator_user),
    db: Session = Depends(get_db),
) -> CollectionResponse:
    """Add an approved track to a staff-managed collection."""
    return add_collection_track(db=db, admin_user=current_user, collection_id=collection_id, payload=payload)


@router.delete("/collections/{collection_id}/tracks/{track_id}", response_model=CollectionResponse)
def remove_collection_track_endpoint(
    collection_id: int,
    track_id: int,
    current_user: User = Depends(get_moderator_user),
    db: Session = Depends(get_db),
) -> CollectionResponse:
    """Remove a track from a staff-managed collection."""
    return remove_collection_track(db=db, admin_user=current_user, collection_id=collection_id, track_id=track_id)


@router.put("/collections/{collection_id}/tracks/reorder", response_model=CollectionResponse)
def reorder_collection_tracks_endpoint(
    collection_id: int,
    payload: CollectionTrackReorder,
    current_user: User = Depends(get_moderator_user),
    db: Session = Depends(get_db),
) -> CollectionResponse:
    """Reorder tracks inside a staff-managed collection."""
    return reorder_collection_tracks(db=db, admin_user=current_user, collection_id=collection_id, payload=payload)
