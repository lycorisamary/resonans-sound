from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    hash_token,
    verify_password,
)
from app.models import APIToken, User, UserStatus
from app.schemas import Token, UserLogin, UserRegister


def _find_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(func.lower(User.email) == email.strip().lower()).first()


def _find_user_by_username(db: Session, username: str) -> User | None:
    return db.query(User).filter(func.lower(User.username) == username.strip().lower()).first()


def _build_token_response(db: Session, user: User) -> Token:
    access_token = create_access_token(user)
    refresh_token = create_refresh_token(user)
    refresh_expiry = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    db.add(
        APIToken(
            user_id=user.id,
            token_hash=hash_token(refresh_token),
            token_type="refresh",
            expires_at=refresh_expiry,
            description="web_session",
        )
    )
    db.commit()

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )


def register_user(db: Session, payload: UserRegister) -> Token:
    if _find_user_by_email(db, payload.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")

    if _find_user_by_username(db, payload.username):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username is already taken")

    user = User(
        email=payload.email.strip().lower(),
        username=payload.username.strip(),
        password_hash=get_password_hash(payload.password),
        status=UserStatus.active,
        email_verified=False,
        last_login=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return _build_token_response(db, user)


def login_user(db: Session, payload: UserLogin) -> Token:
    user = _find_user_by_email(db, payload.email)
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if user.status != UserStatus.active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is not active")

    user.last_login = datetime.now(timezone.utc)
    db.add(user)
    db.commit()
    db.refresh(user)

    return _build_token_response(db, user)


def refresh_user_tokens(db: Session, refresh_token: str) -> Token:
    token_data = decode_token(refresh_token, expected_type="refresh")
    token_hash = hash_token(refresh_token)

    stored_token = (
        db.query(APIToken)
        .filter(
            APIToken.user_id == token_data.user_id,
            APIToken.token_hash == token_hash,
            APIToken.token_type == "refresh",
            APIToken.is_revoked.is_(False),
        )
        .first()
    )

    if stored_token is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    if stored_token.expires_at and stored_token.expires_at < datetime.now(timezone.utc):
        stored_token.is_revoked = True
        db.add(stored_token)
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")

    user = db.query(User).filter(User.id == token_data.user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    if user.status != UserStatus.active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is not active")

    stored_token.is_revoked = True
    db.add(stored_token)
    db.commit()

    return _build_token_response(db, user)


def logout_user(db: Session, refresh_token: str) -> None:
    token_hash = hash_token(refresh_token)
    stored_token = (
        db.query(APIToken)
        .filter(
            APIToken.token_hash == token_hash,
            APIToken.token_type == "refresh",
            APIToken.is_revoked.is_(False),
        )
        .first()
    )

    if stored_token is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Refresh token not found")

    stored_token.is_revoked = True
    db.add(stored_token)
    db.commit()
