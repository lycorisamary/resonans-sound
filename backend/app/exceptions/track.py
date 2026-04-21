from fastapi import status

from app.exceptions.base import DomainError


class TrackNotFoundError(DomainError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "track_not_found"
    message = "Track not found"


class TrackAccessDeniedError(DomainError):
    status_code = status.HTTP_403_FORBIDDEN
    code = "track_access_denied"
    message = "Track access denied"


class TrackConflictError(DomainError):
    status_code = status.HTTP_409_CONFLICT
    code = "track_conflict"
    message = "Track state does not allow this operation"


class TrackMediaNotFoundError(DomainError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "track_media_not_found"
    message = "Track media not found"


class TrackMediaNotReadyError(DomainError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "track_media_not_ready"
    message = "Requested media asset is not ready"


class InvalidUploadError(DomainError):
    status_code = status.HTTP_400_BAD_REQUEST
    code = "invalid_upload"
    message = "Invalid upload"
