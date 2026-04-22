from app.exceptions.artist import ArtistConflictError, ArtistNotFoundError
from app.exceptions.auth import RefreshTokenInvalidError
from app.exceptions.base import DomainError
from app.exceptions.collection import CollectionConflictError, CollectionNotFoundError, CollectionTrackNotFoundError
from app.exceptions.rate_limit import RateLimitExceededError
from app.exceptions.storage import StorageUnavailableError
from app.exceptions.track import (
    InvalidUploadError,
    TrackAccessDeniedError,
    TrackConflictError,
    TrackMediaNotFoundError,
    TrackMediaNotReadyError,
    TrackNotFoundError,
)


__all__ = [
    "DomainError",
    "ArtistNotFoundError",
    "ArtistConflictError",
    "CollectionConflictError",
    "CollectionNotFoundError",
    "CollectionTrackNotFoundError",
    "InvalidUploadError",
    "RateLimitExceededError",
    "RefreshTokenInvalidError",
    "StorageUnavailableError",
    "TrackAccessDeniedError",
    "TrackConflictError",
    "TrackMediaNotFoundError",
    "TrackMediaNotReadyError",
    "TrackNotFoundError",
]
