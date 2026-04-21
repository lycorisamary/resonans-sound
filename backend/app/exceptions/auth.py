from fastapi import status

from app.exceptions.base import DomainError


class RefreshTokenInvalidError(DomainError):
    status_code = status.HTTP_401_UNAUTHORIZED
    code = "refresh_token_invalid"
    message = "Invalid refresh token"
