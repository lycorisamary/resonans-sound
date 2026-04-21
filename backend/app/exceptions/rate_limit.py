from fastapi import status

from app.exceptions.base import DomainError


class RateLimitExceededError(DomainError):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    code = "rate_limit_exceeded"
    message = "Too many requests. Please try again later."

    def __init__(self, retry_after_seconds: int) -> None:
        self.retry_after_seconds = max(1, int(retry_after_seconds))
        super().__init__(self.message)
