from fastapi import APIRouter, Depends, File, Request, UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas import ArtistProfileCreate, ArtistProfileResponse, ArtistProfileUpdate, UserResponse
from app.services.artists import create_own_artist_profile, get_own_artist, update_own_artist_profile, upload_own_profile_image
from app.services.rate_limit import RateLimit, enforce_rate_limit, user_subject


router = APIRouter()


def _rate_limited_profile_upload_user(
    request: Request,
    current_user: User = Depends(get_current_user),
) -> User:
    enforce_rate_limit(
        request=request,
        scope="users_profile_image_upload",
        subject=user_subject(current_user.id),
        limit=RateLimit(settings.COVER_UPLOAD_RATE_LIMIT_PER_HOUR, 60 * 60),
    )
    return current_user


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """Return the authenticated user profile."""
    return UserResponse.model_validate(current_user)


@router.put("/me/profile", response_model=ArtistProfileResponse)
def update_me_profile(
    payload: ArtistProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ArtistProfileResponse:
    """Update the authenticated user's public artist profile."""
    return update_own_artist_profile(db=db, current_user=current_user, payload=payload)


@router.get("/me/artist", response_model=ArtistProfileResponse | None)
def get_me_artist(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ArtistProfileResponse | None:
    """Return the authenticated user's artist profile when registered."""
    return get_own_artist(db=db, current_user=current_user)


@router.post("/me/artist", response_model=ArtistProfileResponse, status_code=201)
def create_me_artist(
    payload: ArtistProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ArtistProfileResponse:
    """Register the authenticated user as an artist."""
    return create_own_artist_profile(db=db, current_user=current_user, payload=payload)


@router.post("/me/avatar", response_model=ArtistProfileResponse, status_code=202)
def upload_me_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(_rate_limited_profile_upload_user),
    db: Session = Depends(get_db),
) -> ArtistProfileResponse:
    """Upload or replace the authenticated user's artist avatar."""
    return upload_own_profile_image(db=db, current_user=current_user, upload_file_object=file, image_kind="avatar")


@router.post("/me/banner", response_model=ArtistProfileResponse, status_code=202)
def upload_me_banner(
    file: UploadFile = File(...),
    current_user: User = Depends(_rate_limited_profile_upload_user),
    db: Session = Depends(get_db),
) -> ArtistProfileResponse:
    """Upload or replace the authenticated user's artist banner."""
    return upload_own_profile_image(db=db, current_user=current_user, upload_file_object=file, image_kind="banner")
