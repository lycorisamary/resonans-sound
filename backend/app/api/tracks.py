from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas import PaginatedResponse, TrackResponse, TrackUploadResponse
from app.services.catalog import build_public_tracks_page, get_public_track
from app.services.streaming import build_track_stream_response
from app.services.tracks import (
    create_track_metadata,
    delete_track_metadata,
    list_user_tracks,
    update_track_metadata,
    upload_track_source,
)
from app.schemas import TrackCreate, TrackUpdate


router = APIRouter()


@router.get("/mine", response_model=PaginatedResponse)
def get_my_tracks(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaginatedResponse:
    """Return the authenticated user's tracks, including pending items."""
    return list_user_tracks(db=db, current_user=current_user, page=page, size=size)


@router.get("", response_model=PaginatedResponse)
def get_tracks(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    category: str | None = Query(None, min_length=2, max_length=100),
    genre: str | None = Query(None, min_length=1, max_length=100),
    search: str | None = Query(None, min_length=1, max_length=255),
    db: Session = Depends(get_db),
) -> PaginatedResponse:
    """Return approved public tracks with lightweight catalog filters."""
    return build_public_tracks_page(
        db=db,
        page=page,
        size=size,
        category_slug=category,
        genre=genre,
        search=search,
    )


@router.post("", response_model=TrackResponse, status_code=201)
def create_track(
    payload: TrackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TrackResponse:
    """Create track metadata for the authenticated user."""
    return create_track_metadata(db=db, current_user=current_user, payload=payload)


@router.post("/upload", response_model=TrackUploadResponse, status_code=202)
def upload_track(
    track_id: int = Form(..., gt=0),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TrackUploadResponse:
    """Attach an audio upload to an existing owned track and queue processing."""
    return upload_track_source(
        db=db,
        current_user=current_user,
        track_id=track_id,
        upload_file_object=file,
    )


@router.get("/{track_id}/stream")
def stream_track(
    track_id: int,
    quality: str = Query("320"),
    range_header: str | None = Header(default=None, alias="Range"),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    """Stream an approved public track with optional HTTP Range support."""
    return build_track_stream_response(
        db=db,
        track_id=track_id,
        quality=quality,
        range_header=range_header,
    )


@router.get("/{track_id}", response_model=TrackResponse)
def get_track(track_id: int, db: Session = Depends(get_db)) -> TrackResponse:
    """Return a single approved public track."""
    track = get_public_track(db, track_id)
    if track is None:
        raise HTTPException(status_code=404, detail="Track not found")
    return track


@router.put("/{track_id}", response_model=TrackResponse)
def update_track(
    track_id: int,
    payload: TrackUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TrackResponse:
    """Update track metadata for the owner."""
    return update_track_metadata(db=db, current_user=current_user, track_id=track_id, payload=payload)


@router.delete("/{track_id}")
def delete_track(
    track_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Soft-delete a track for the owner."""
    delete_track_metadata(db=db, current_user=current_user, track_id=track_id)
    return {"detail": "Track deleted"}
