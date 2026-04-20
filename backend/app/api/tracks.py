from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.security import (
    get_current_user,
    get_optional_current_user,
    get_user_from_stream_token,
    resolve_optional_current_user,
)
from app.db.session import get_db
from app.models import User
from app.schemas import PaginatedResponse, StreamUrlResponse, TrackResponse, TrackUploadResponse
from app.services.catalog import build_public_tracks_page, get_public_track
from app.services.streaming import build_track_cover_response, build_track_stream_response, build_track_stream_url_response
from app.services.tracks import (
    create_track_metadata,
    delete_track_metadata,
    list_user_tracks,
    update_track_metadata,
    upload_track_cover,
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
    sort: str = Query("newest", min_length=3, max_length=32),
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
        sort=sort,
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


@router.post("/{track_id}/cover", response_model=TrackUploadResponse, status_code=202)
def upload_cover(
    track_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TrackUploadResponse:
    """Attach or replace a track cover image for the owner."""
    return upload_track_cover(
        db=db,
        current_user=current_user,
        track_id=track_id,
        upload_file_object=file,
    )


@router.get("/{track_id}/stream")
def stream_track(
    track_id: int,
    quality: str = Query("320"),
    stream_token: str | None = Query(default=None),
    range_header: str | None = Header(default=None, alias="Range"),
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    """Stream an approved public track with optional HTTP Range support."""
    current_user = resolve_optional_current_user(authorization=authorization, db=db)
    if current_user is None:
        current_user = get_user_from_stream_token(
            token=stream_token,
            track_id=track_id,
            quality=quality,
            db=db,
        )

    return build_track_stream_response(
        db=db,
        track_id=track_id,
        quality=quality,
        current_user=current_user,
        range_header=range_header,
    )


@router.get("/{track_id}/stream-url", response_model=StreamUrlResponse)
def get_track_stream_url(
    track_id: int,
    quality: str = Query("320"),
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
    ) -> StreamUrlResponse:
    """Return a browser-safe stream URL for the current access context."""
    return build_track_stream_url_response(
        db=db,
        track_id=track_id,
        quality=quality,
        current_user=current_user,
    )


@router.get("/{track_id}/cover")
def get_track_cover(
    track_id: int,
    db: Session = Depends(get_db),
) -> StreamingResponse:
    """Return the public track cover image when it exists."""
    return build_track_cover_response(db=db, track_id=track_id)


@router.get("/{track_id}", response_model=TrackResponse)
def get_track(track_id: int, db: Session = Depends(get_db)) -> TrackResponse:
    """Return a single published track."""
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
    """Soft-delete a track for the owner or for moderator/admin roles."""
    delete_track_metadata(db=db, current_user=current_user, track_id=track_id)
    return {"detail": "Track deleted"}
