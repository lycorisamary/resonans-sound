from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas import RefreshTokenRequest, Token, UserLogin, UserRegister
from app.services.auth import login_user, logout_user, refresh_user_tokens, register_user


router = APIRouter()


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)) -> Token:
    """Register a new user and create an authenticated session."""
    return register_user(db, payload)


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> Token:
    """Login with email and password."""
    return login_user(db, payload)


@router.post("/refresh", response_model=Token)
def refresh(payload: RefreshTokenRequest, db: Session = Depends(get_db)) -> Token:
    """Exchange a refresh token for a new access/refresh pair."""
    return refresh_user_tokens(db, payload.refresh_token)


@router.post("/logout")
def logout(payload: RefreshTokenRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    """Revoke a refresh token."""
    logout_user(db, payload.refresh_token)
    return {"detail": "Logged out"}
