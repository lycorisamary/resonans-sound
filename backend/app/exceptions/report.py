from fastapi import status

from app.exceptions.base import DomainError


class ReportConflictError(DomainError):
    status_code = status.HTTP_409_CONFLICT
    code = "report_conflict"
    message = "Report cannot be submitted in the current state."


class ReportNotFoundError(DomainError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "report_not_found"
    message = "Report not found."

