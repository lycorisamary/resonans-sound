from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.models import ReportStatus, TrackStatus
from app.schemas import TrackReportCreate, TrackReportResolve
from app.services import reports as reports_service


def make_report(status: str = ReportStatus.open.value, track=None):
    now = datetime.now(timezone.utc)
    return SimpleNamespace(
        id=5,
        reporter_id=7,
        track_id=getattr(track, "id", 10),
        reason="spam",
        description="spam upload",
        status=status,
        moderator_id=None,
        reviewed_at=None,
        resolution_notes=None,
        created_at=now,
        track=track,
    )


def make_track():
    now = datetime.now(timezone.utc)
    return SimpleNamespace(
        id=10,
        user_id=8,
        artist_id=4,
        title="Reported track",
        description=None,
        genre="Ambient",
        category_id=None,
        duration_seconds=30,
        file_size_bytes=1024,
        original_url=None,
        mp3_128_url="/media/128.mp3",
        mp3_320_url="/media/320.mp3",
        cover_image_url=None,
        waveform_data_json=None,
        metadata_json=None,
        status=TrackStatus.approved,
        created_at=now,
        updated_at=now,
        play_count=0,
        like_count=0,
        comment_count=0,
        is_public=True,
        is_downloadable=False,
        license_type="all-rights-reserved",
        tags=["spam"],
        rejection_reason=None,
        user=None,
        artist=None,
        category=None,
    )


def test_report_create_rejects_unknown_reason():
    with pytest.raises(ValidationError):
        TrackReportCreate(track_id=10, reason="unknown")


def test_report_resolve_rejects_blank_notes_to_none():
    payload = TrackReportResolve(status="resolved", resolution_notes="  ", hide_track=True)

    assert payload.resolution_notes is None


def test_report_serialization_can_include_track():
    response = reports_service._serialize_report(make_report(track=make_track()), include_track=True)

    assert response.reason == "spam"
    assert response.status == "open"
    assert response.track is not None
    assert response.track.id == 10
