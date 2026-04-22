from typing import Literal

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas import ArtistProfileResponse, PaginatedResponse
from app.services.artists import (
    build_public_profile_image_response,
    get_public_artist,
    list_artist_tracks,
    list_public_artists,
)


router = APIRouter()


@router.get("", response_model=PaginatedResponse)
def get_artists(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, min_length=1, max_length=255),
    genre: str | None = Query(None, min_length=1, max_length=100),
    location: str | None = Query(None, min_length=1, max_length=100),
    sort: Literal["recommended", "popular", "newest", "name"] = Query("recommended"),
    db: Session = Depends(get_db),
) -> PaginatedResponse:
    """Return active public artist profiles ordered for discovery."""
    return list_public_artists(db=db, page=page, size=size, search=search, genre=genre, location=location, sort=sort)


@router.get("/{username}", response_model=ArtistProfileResponse)
def get_artist(username: str, db: Session = Depends(get_db)) -> ArtistProfileResponse:
    """Return a public artist profile by immutable username."""
    return get_public_artist(db=db, username=username)


@router.get("/{username}/tracks", response_model=PaginatedResponse)
def get_artist_tracks(
    username: str,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    sort: str = Query("newest", min_length=3, max_length=32),
    db: Session = Depends(get_db),
) -> PaginatedResponse:
    """Return approved public tracks for an active artist."""
    return list_artist_tracks(db=db, username=username, page=page, size=size, sort=sort)


@router.get("/{username}/avatar")
def get_artist_avatar(username: str, db: Session = Depends(get_db)) -> StreamingResponse:
    """Return the public artist avatar image when it exists."""
    return build_public_profile_image_response(db=db, username=username, image_kind="avatar")


@router.get("/{username}/banner")
def get_artist_banner(username: str, db: Session = Depends(get_db)) -> StreamingResponse:
    """Return the public artist banner image when it exists."""
    return build_public_profile_image_response(db=db, username=username, image_kind="banner")
