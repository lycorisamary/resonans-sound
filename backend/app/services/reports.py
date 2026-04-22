from __future__ import annotations

from datetime import datetime, timezone
from math import ceil

from sqlalchemy.orm import Session, joinedload

from app.exceptions import ReportConflictError, ReportNotFoundError, TrackNotFoundError
from app.models import AdminLog, Report, ReportStatus, Track, TrackStatus, User
from app.schemas import PaginatedResponse, TrackReportCreate, TrackReportResolve, TrackReportResponse
from app.services.catalog import serialize_track


def _serialize_report(report: Report, include_track: bool = False) -> TrackReportResponse:
    return TrackReportResponse.model_validate(
        {
            "id": report.id,
            "reporter_id": report.reporter_id,
            "track_id": report.track_id,
            "reason": report.reason,
            "description": report.description,
            "status": report.status or ReportStatus.open.value,
            "moderator_id": report.moderator_id,
            "reviewed_at": report.reviewed_at,
            "resolution_notes": report.resolution_notes,
            "created_at": report.created_at,
            "track": serialize_track(report.track) if include_track and report.track is not None else None,
        }
    )


def create_track_report(db: Session, current_user: User, payload: TrackReportCreate) -> TrackReportResponse:
    track = (
        db.query(Track)
        .filter(
            Track.id == payload.track_id,
            Track.status == TrackStatus.approved,
        )
        .first()
    )
    if track is None:
        raise TrackNotFoundError("Track is not available for reports.")

    existing = (
        db.query(Report)
        .filter(
            Report.reporter_id == current_user.id,
            Report.track_id == track.id,
            Report.status == ReportStatus.open.value,
        )
        .first()
    )
    if existing is not None:
        raise ReportConflictError("You already have an open report for this track.")

    report = Report(
        reporter_id=current_user.id,
        track_id=track.id,
        reason=payload.reason.value,
        description=payload.description,
        status=ReportStatus.open.value,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return _serialize_report(report)


def list_track_reports(
    db: Session,
    page: int,
    size: int,
    status_filter: str | None = None,
) -> PaginatedResponse:
    query = db.query(Report).options(
        joinedload(Report.track).joinedload(Track.user),
        joinedload(Report.track).joinedload(Track.artist),
        joinedload(Report.track).joinedload(Track.category),
    )
    if status_filter:
        query = query.filter(Report.status == status_filter)

    total = query.order_by(None).count()
    items = (
        query.order_by(Report.created_at.desc(), Report.id.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )

    return PaginatedResponse(
        items=[_serialize_report(report, include_track=True).model_dump() for report in items],
        total=total,
        page=page,
        size=size,
        pages=ceil(total / size) if total else 0,
    )


def resolve_track_report(
    db: Session,
    admin_user: User,
    report_id: int,
    payload: TrackReportResolve,
) -> TrackReportResponse:
    report = (
        db.query(Report)
        .options(
            joinedload(Report.track).joinedload(Track.user),
            joinedload(Report.track).joinedload(Track.artist),
            joinedload(Report.track).joinedload(Track.category),
        )
        .filter(Report.id == report_id)
        .first()
    )
    if report is None:
        raise ReportNotFoundError()

    if payload.status.value == ReportStatus.open.value:
        raise ReportConflictError("Staff resolution cannot move a report back to open.")

    report.status = payload.status.value
    report.moderator_id = admin_user.id
    report.reviewed_at = datetime.now(timezone.utc)
    report.resolution_notes = payload.resolution_notes

    if payload.hide_track and report.track is not None and report.track.status != TrackStatus.deleted:
        previous_status = report.track.status
        report.track.status = TrackStatus.hidden
        report.track.is_public = False
        report.track.rejection_reason = payload.resolution_notes or "Hidden after user report"
        db.add(report.track)
        db.add(
            AdminLog(
                admin_id=admin_user.id,
                action="track_hidden_from_report",
                target_type="track",
                target_id=report.track.id,
                details={
                    "report_id": report.id,
                    "previous_status": previous_status.value,
                    "reason": report.reason,
                },
            )
        )

    db.add(report)
    db.commit()
    db.refresh(report)
    return _serialize_report(report, include_track=True)
