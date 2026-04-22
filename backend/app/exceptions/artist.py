from fastapi import status

from app.exceptions.base import DomainError


class ArtistNotFoundError(DomainError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "artist_not_found"
    message = "Artist not found"
