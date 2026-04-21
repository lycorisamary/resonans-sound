from __future__ import annotations

from fastapi import status


class DomainError(Exception):
    status_code = status.HTTP_400_BAD_REQUEST
    code = "domain_error"
    message = "Domain error"

    def __init__(self, message: str | None = None, *, details: dict | None = None) -> None:
        self.message = message or self.message
        self.details = details
        super().__init__(self.message)
