from fastapi import status

from app.exceptions.base import DomainError


class StorageUnavailableError(DomainError):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    code = "storage_unavailable"
    message = "Storage is temporarily unavailable"
