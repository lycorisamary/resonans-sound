from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from uuid import uuid4

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models import User, UserRole, UserStatus
from app.schemas import TokenData


pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


@dataclass(frozen=True)
class StreamTokenData:
    user_id: int
    username: str | None
    role: str | None
    track_id: int
    quality: str
    expires_at: datetime | None


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def hash_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


def _build_token_payload(user: User, expires_delta: timedelta, token_type: str) -> dict:
    issued_at = datetime.now(timezone.utc)
    expire = issued_at + expires_delta
    return {
        "sub": str(user.id),
        "username": user.username,
        "role": user.role.value,
        "type": token_type,
        "iat": issued_at,
        "jti": uuid4().hex,
        "exp": expire,
    }


def create_access_token(user: User) -> str:
    payload = _build_token_payload(
        user=user,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        token_type="access",
    )
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(user: User) -> str:
    payload = _build_token_payload(
        user=user,
        expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        token_type="refresh",
    )
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_stream_token(user: User, track_id: int, quality: str) -> tuple[str, datetime]:
    expires_delta = timedelta(minutes=settings.STREAM_TOKEN_EXPIRE_MINUTES)
    payload = _build_token_payload(
        user=user,
        expires_delta=expires_delta,
        token_type="stream",
    )
    payload["track_id"] = track_id
    payload["quality"] = quality
    expires_at = datetime.now(timezone.utc) + expires_delta
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM), expires_at


def decode_token(token: str, expected_type: str) -> TokenData:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        token_type = payload.get("type")
        user_id = payload.get("sub")
        username = payload.get("username")
        role = payload.get("role")

        if token_type != expected_type or user_id is None:
            raise credentials_exception

        return TokenData(user_id=int(user_id), username=username, role=role)
    except (JWTError, ValueError):
        raise credentials_exception


def decode_stream_token(token: str) -> StreamTokenData:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate stream token",
    )

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        token_type = payload.get("type")
        user_id = payload.get("sub")
        track_id = payload.get("track_id")
        quality = payload.get("quality")
        expires_at = payload.get("exp")

        if token_type != "stream" or user_id is None or track_id is None or quality is None:
            raise credentials_exception

        parsed_expiry = None
        if expires_at is not None:
            parsed_expiry = datetime.fromtimestamp(expires_at, tz=timezone.utc)

        return StreamTokenData(
            user_id=int(user_id),
            username=payload.get("username"),
            role=payload.get("role"),
            track_id=int(track_id),
            quality=str(quality),
            expires_at=parsed_expiry,
        )
    except (JWTError, ValueError, TypeError):
        raise credentials_exception


def resolve_optional_current_user(authorization: str | None, db: Session) -> User | None:
    if not authorization:
        return None

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None

    try:
        token_data = decode_token(token, expected_type="access")
    except HTTPException:
        return None

    user = db.query(User).filter(User.id == token_data.user_id).first()
    if user is None or user.status != UserStatus.active:
        return None

    return user


def get_user_from_stream_token(
    token: str | None,
    track_id: int,
    quality: str,
    db: Session,
) -> User | None:
    if not token:
        return None

    try:
        token_data = decode_stream_token(token)
    except HTTPException:
        return None

    if token_data.track_id != track_id or token_data.quality != quality:
        return None

    user = db.query(User).filter(User.id == token_data.user_id).first()
    if user is None or user.status != UserStatus.active:
        return None

    return user


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    token_data = decode_token(token, expected_type="access")
    user = db.query(User).filter(User.id == token_data.user_id).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.status != UserStatus.active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not active",
        )

    return user


def get_optional_current_user(
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> User | None:
    return resolve_optional_current_user(authorization=authorization, db=db)


def get_moderator_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in {UserRole.moderator, UserRole.admin}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Moderator or admin access required",
        )

    return current_user
