from datetime import datetime, timezone
from types import SimpleNamespace

from app.models import TrackStatus, UserRole
from app.schemas import TrackModeration, TrackModerationStatusEnum, TrackStatusEnum
from app.services import admin as admin_service


class FakeDB:
    def __init__(self):
        self.added = []
        self.commits = 0

    def add(self, item):
        self.added.append(item)

    def commit(self):
        self.commits += 1

    def refresh(self, item):
        return None


def make_track(status: TrackStatus = TrackStatus.approved):
    now = datetime.now(timezone.utc)
    return SimpleNamespace(
        id=12,
        user_id=7,
        title="Demo",
        description=None,
        genre=None,
        category_id=None,
        duration_seconds=30,
        file_size_bytes=1024,
        original_url="/api/v1/tracks/12/stream?quality=original",
        mp3_128_url=None,
        mp3_320_url="/api/v1/tracks/12/stream?quality=320",
        cover_image_url=None,
        waveform_data_json=None,
        metadata_json=None,
        status=status,
        created_at=now,
        updated_at=now,
        play_count=0,
        like_count=0,
        comment_count=0,
        is_public=True,
        is_downloadable=False,
        license_type="all-rights-reserved",
        tags=None,
        bpm=None,
        key_signature=None,
        rejection_reason=None,
        user=None,
        category=None,
    )


def make_admin():
    return SimpleNamespace(id=1, role=UserRole.admin)


def test_staff_can_hide_track_without_deleting(monkeypatch):
    track = make_track()
    db = FakeDB()
    monkeypatch.setattr(admin_service, "_get_track_for_moderation", lambda db, track_id: track)

    response = admin_service.moderate_track(
        db=db,
        admin_user=make_admin(),
        track_id=track.id,
        payload=TrackModeration(status=TrackModerationStatusEnum.hidden, rejection_reason="Spam upload"),
    )

    assert response.status == TrackStatusEnum.hidden
    assert track.status == TrackStatus.hidden
    assert track.is_public is False
    assert track.rejection_reason == "Spam upload"
    assert db.commits == 1


def test_staff_restore_requires_ready_media(monkeypatch):
    track = make_track(status=TrackStatus.hidden)
    track.original_url = None
    track.mp3_320_url = None
    db = FakeDB()
    monkeypatch.setattr(admin_service, "_get_track_for_moderation", lambda db, track_id: track)

    try:
        admin_service.moderate_track(
            db=db,
            admin_user=make_admin(),
            track_id=track.id,
            payload=TrackModeration(status=TrackModerationStatusEnum.approved),
        )
    except Exception as exc:
        assert "no ready media" in str(exc)
    else:
        raise AssertionError("Expected restore without ready media to fail")
