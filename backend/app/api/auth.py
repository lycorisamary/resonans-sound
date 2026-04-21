from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.schemas import RefreshTokenRequest, Token, UserLogin, UserRegister
from app.services.rate_limit import RateLimit, enforce_rate_limit, ip_subject, token_subject
from app.services.auth import login_user, logout_user, refresh_user_tokens, register_user


router = APIRouter()


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(request: Request, payload: UserRegister, db: Session = Depends(get_db)) -> Token:
    """Register a new user and create an authenticated session."""
    enforce_rate_limit(
        request=request,
        scope="auth_register",
        subject=ip_subject(request),
        limit=RateLimit(settings.AUTH_REGISTER_RATE_LIMIT_PER_HOUR, 60 * 60),
    )
    return register_user(db, payload)


@router.post("/login", response_model=Token)
def login(request: Request, payload: UserLogin, db: Session = Depends(get_db)) -> Token:
    """Login with email and password."""
    enforce_rate_limit(
        request=request,
        scope="auth_login",
        subject=ip_subject(request),
        limit=RateLimit(settings.AUTH_LOGIN_RATE_LIMIT_PER_MINUTE, 60),
    )
    return login_user(db, payload)


@router.post("/refresh", response_model=Token)
def refresh(request: Request, payload: RefreshTokenRequest, db: Session = Depends(get_db)) -> Token:
    """Exchange a refresh token for a new access/refresh pair."""
    enforce_rate_limit(
        request=request,
        scope="auth_refresh",
        subject=token_subject(payload.refresh_token),
        limit=RateLimit(settings.AUTH_REFRESH_RATE_LIMIT_PER_MINUTE, 60),
    )
    return refresh_user_tokens(db, payload.refresh_token)


@router.post("/logout")
def logout(payload: RefreshTokenRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    """Revoke a refresh token."""
    logout_user(db, payload.refresh_token)
    return {"detail": "Logged out"}
