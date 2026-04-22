from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.models import Track, TrackPlayEvent, TrackStatus
from app.services.play_events import PLAY_DEDUPE_WINDOW_SECONDS, record_track_play


class FakeQuery:
    def __init__(self, db, model):
        self.db = db
        self.model = model

    def filter(self, *args, **kwargs):
        return self

    def with_for_update(self):
        return self

    def order_by(self, *args, **kwargs):
        return self

    def first(self):
        if self.model is Track:
            return self.db.track
        if self.model is TrackPlayEvent:
            return self.db.events[-1] if self.db.events else None
        return None


class FakeDB:
    def __init__(self, track):
        self.track = track
        self.events = []
        self.commits = 0

    def query(self, model):
        return FakeQuery(self, model)

    def add(self, item):
        if isinstance(item, TrackPlayEvent):
            self.events.append(item)

    def commit(self):
        self.commits += 1

    def refresh(self, item):
        return None


def make_request(ip: str = "203.0.113.10", user_agent: str = "pytest-player"):
    return SimpleNamespace(headers={"user-agent": user_agent}, client=SimpleNamespace(host=ip))


def make_track(status: TrackStatus = TrackStatus.approved):
    return SimpleNamespace(
        id=42,
        status=status,
        play_count=0,
    )


def test_record_track_play_counts_approved_track_once_and_dedupes():
    db = FakeDB(make_track())
    request = make_request()

    first = record_track_play(db=db, track_id=42, request=request, current_user=None)
    second = record_track_play(db=db, track_id=42, request=request, current_user=None)

    assert first.counted is True
    assert first.play_count == 1
    assert second.counted is False
    assert second.play_count == 1
    assert len(db.events) == 1
    assert db.commits == 2
    assert first.dedupe_window_seconds == PLAY_DEDUPE_WINDOW_SECONDS


def test_record_track_play_hashes_guest_listener_without_raw_ip_storage():
    db = FakeDB(make_track())

    record_track_play(db=db, track_id=42, request=make_request(ip="203.0.113.55"), current_user=None)

    event = db.events[0]
    assert event.user_id is None
    assert len(event.listener_hash) == 64
    assert "203.0.113.55" not in event.listener_hash


def test_record_track_play_uses_auth_user_identity_for_listener_hash():
    db = FakeDB(make_track())
    request_one = make_request(ip="203.0.113.10", user_agent="browser-a")
    request_two = make_request(ip="198.51.100.20", user_agent="browser-b")
    user = SimpleNamespace(id=7)

    first = record_track_play(db=db, track_id=42, request=request_one, current_user=user)
    second = record_track_play(db=db, track_id=42, request=request_two, current_user=user)

    assert first.counted is True
    assert second.counted is False
    assert db.events[0].user_id == 7


@pytest.mark.parametrize(
    "status",
    [
        TrackStatus.pending,
        TrackStatus.processing,
        TrackStatus.rejected,
        TrackStatus.hidden,
        TrackStatus.deleted,
    ],
)
def test_record_track_play_rejects_non_approved_tracks(status):
    db = FakeDB(make_track(status=status))

    with pytest.raises(HTTPException) as exc_info:
        record_track_play(db=db, track_id=42, request=make_request(), current_user=None)

    assert exc_info.value.status_code == 404
    assert db.events == []
    assert db.track.play_count == 0
