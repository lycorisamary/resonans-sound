from types import SimpleNamespace
from urllib.parse import parse_qs, urlparse

from app.core.security import create_stream_token, get_user_from_stream_token
from app.models import TrackStatus, UserRole, UserStatus
from app.services import streaming


class FakeQuery:
    def __init__(self, user):
        self.user = user

    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return self.user


class FakeDB:
    def __init__(self, user):
        self.user = user

    def query(self, model):
        return FakeQuery(self.user)


def make_user(user_id: int = 7, role: UserRole = UserRole.user):
    return SimpleNamespace(
        id=user_id,
        username="alice",
        role=role,
        status=UserStatus.active,
    )


def make_track(
    track_id: int = 12,
    status: TrackStatus = TrackStatus.approved,
    is_public: bool = True,
    user_id: int = 7,
):
    return SimpleNamespace(
        id=track_id,
        status=status,
        is_public=is_public,
        user_id=user_id,
        metadata_json={
            "storage": {
                "original_object_key": f"tracks/{track_id}/original.wav",
                "processed_object_keys": {"320": f"tracks/{track_id}/320.mp3"},
            },
            "upload": {"content_type": "audio/wav"},
        },
    )


def test_stream_token_round_trip_requires_matching_track_and_quality():
    user = make_user()
    token, _ = create_stream_token(user, track_id=12, quality="320")
    db = FakeDB(user)

    resolved_user = get_user_from_stream_token(token=token, track_id=12, quality="320", db=db)
    assert resolved_user is user

    assert get_user_from_stream_token(token=token, track_id=99, quality="320", db=db) is None
    assert get_user_from_stream_token(token=token, track_id=12, quality="128", db=db) is None


def test_parse_range_supports_regular_and_suffix_ranges():
    direct_range = streaming._parse_range("bytes=10-19", total_size=100)
    suffix_range = streaming._parse_range("bytes=-12", total_size=100)

    assert direct_range.start == 10
    assert direct_range.end == 19
    assert direct_range.length == 10

    assert suffix_range.start == 88
    assert suffix_range.end == 99
    assert suffix_range.length == 12


def test_private_streams_are_owner_or_moderator_only():
    private_track = make_track(status=TrackStatus.pending, is_public=False, user_id=42)

    assert not streaming._can_stream_track(private_track, current_user=None)
    assert not streaming._can_stream_track(private_track, current_user=make_user(user_id=7))
    assert streaming._can_stream_track(private_track, current_user=make_user(user_id=42))
    assert streaming._can_stream_track(private_track, current_user=make_user(user_id=99, role=UserRole.moderator))


def test_build_track_stream_url_response_returns_direct_public_url(monkeypatch):
    track = make_track(track_id=21, status=TrackStatus.approved, is_public=False)

    monkeypatch.setattr(streaming, "_get_streamable_track", lambda db, track_id: track)
    monkeypatch.setattr(streaming, "_resolve_object_key", lambda track, quality: ("tracks/21/320.mp3", "audio/mpeg"))

    response = streaming.build_track_stream_url_response(
        db=object(),
        track_id=21,
        quality="320",
        current_user=None,
    )

    assert response.url == "/api/v1/tracks/21/stream?quality=320"
    assert response.quality == "320"
    assert response.expires_at is None


def test_approved_tracks_are_publicly_streamable_even_if_is_public_flag_is_false():
    approved_track = make_track(status=TrackStatus.approved, is_public=False, user_id=42)

    assert streaming._can_stream_track(approved_track, current_user=None)


def test_build_track_stream_url_response_issues_signed_private_url(monkeypatch):
    owner = make_user(user_id=42)
    track = make_track(track_id=55, status=TrackStatus.pending, is_public=False, user_id=42)

    monkeypatch.setattr(streaming, "_get_streamable_track", lambda db, track_id: track)
    monkeypatch.setattr(streaming, "_resolve_object_key", lambda track, quality: ("tracks/55/320.mp3", "audio/mpeg"))

    response = streaming.build_track_stream_url_response(
        db=object(),
        track_id=55,
        quality="320",
        current_user=owner,
    )

    parsed = urlparse(response.url)
    token = parse_qs(parsed.query)["stream_token"][0]

    assert parsed.path == "/api/v1/tracks/55/stream"
    assert response.expires_at is not None
    assert get_user_from_stream_token(token=token, track_id=55, quality="320", db=FakeDB(owner)) is owner


def test_private_streaming_response_disables_public_cache(monkeypatch):
    owner = make_user(user_id=42)
    track = make_track(track_id=55, status=TrackStatus.pending, is_public=False, user_id=42)

    monkeypatch.setattr(streaming, "_get_streamable_track", lambda db, track_id: track)
    monkeypatch.setattr(streaming, "_resolve_object_key", lambda track, quality: ("tracks/55/320.mp3", "audio/mpeg"))
    monkeypatch.setattr(streaming, "stat_object", lambda object_key: SimpleNamespace(size_bytes=128, content_type="audio/mpeg"))
    monkeypatch.setattr(streaming, "_iter_stream", lambda object_key, byte_range: iter([b"test-bytes"]))

    response = streaming.build_track_stream_response(
        db=object(),
        track_id=55,
        quality="320",
        current_user=owner,
        range_header=None,
    )

    assert response.headers["cache-control"] == "private, no-store"
