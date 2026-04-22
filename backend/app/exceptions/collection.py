from fastapi import status

from app.exceptions.base import DomainError


class CollectionNotFoundError(DomainError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "collection_not_found"
    message = "Collection not found"


class CollectionConflictError(DomainError):
    status_code = status.HTTP_409_CONFLICT
    code = "collection_conflict"
    message = "Collection state does not allow this operation"


class CollectionTrackNotFoundError(DomainError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "collection_track_not_found"
    message = "Track is not in this collection"
