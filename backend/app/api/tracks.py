from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas import PaginatedResponse, TrackResponse
from app.services.catalog import build_public_tracks_page, get_public_track


router = APIRouter()


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


@router.get("/{track_id}", response_model=TrackResponse)
def get_track(track_id: int, db: Session = Depends(get_db)) -> TrackResponse:
    """Return a single approved public track."""
    track = get_public_track(db, track_id)
    if track is None:
        raise HTTPException(status_code=404, detail="Track not found")
    return track
