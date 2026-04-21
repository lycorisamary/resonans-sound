from io import BytesIO
from types import SimpleNamespace

import pytest

from app.models import TrackStatus, UserRole
from app.policies import TrackDeletionPolicy, TrackStreamingPolicy, TrackUploadPolicy
from app.services.tracks import _validate_cover_upload


def make_user(user_id: int, role: UserRole = UserRole.user):
    return SimpleNamespace(id=user_id, role=role)


def make_track(user_id: int, status: TrackStatus = TrackStatus.pending):
    return SimpleNamespace(user_id=user_id, status=status)


def make_upload(filename: str, content_type: str, content: bytes):
    return SimpleNamespace(filename=filename, content_type=content_type, file=BytesIO(content))


def test_track_delete_policy_allows_owner_and_staff():
    track = make_track(user_id=42, status=TrackStatus.approved)

    assert TrackDeletionPolicy.can_delete(track, make_user(user_id=42))
    assert TrackDeletionPolicy.can_delete(track, make_user(user_id=7, role=UserRole.admin))
    assert TrackDeletionPolicy.can_delete(track, make_user(user_id=8, role=UserRole.moderator))
    assert not TrackDeletionPolicy.can_delete(track, make_user(user_id=99))


def test_track_delete_policy_denies_deleted_tracks():
    track = make_track(user_id=42, status=TrackStatus.deleted)

    assert not TrackDeletionPolicy.can_delete(track, make_user(user_id=42))
    assert not TrackDeletionPolicy.can_delete(track, make_user(user_id=8, role=UserRole.admin))


def test_track_streaming_policy_allows_pending_preview_only_for_owner_or_staff():
    track = make_track(user_id=42, status=TrackStatus.pending)

    assert not TrackStreamingPolicy.can_stream(track, None)
    assert not TrackStreamingPolicy.can_stream(track, make_user(user_id=7))
    assert TrackStreamingPolicy.can_stream(track, make_user(user_id=42))
    assert TrackStreamingPolicy.can_stream(track, make_user(user_id=99, role=UserRole.moderator))


def test_track_upload_policy_blocks_processing_and_deleted_source_uploads():
    owner = make_user(user_id=42)

    assert TrackUploadPolicy.can_upload_source(make_track(42, TrackStatus.pending), owner)
    assert TrackUploadPolicy.can_upload_source(make_track(42, TrackStatus.approved), owner)
    assert not TrackUploadPolicy.can_upload_source(make_track(42, TrackStatus.processing), owner)
    assert not TrackUploadPolicy.can_upload_source(make_track(42, TrackStatus.deleted), owner)
    assert not TrackUploadPolicy.can_upload_source(make_track(7, TrackStatus.pending), owner)


def test_validate_cover_upload_accepts_supported_image():
    upload = make_upload("cover-art.png", "image/png", b"\x89PNG\r\n\x1a\nvalid")

    safe_filename, content_type = _validate_cover_upload(upload)

    assert safe_filename == "cover-art.png"
    assert content_type == "image/png"


def test_validate_cover_upload_rejects_unsupported_extension():
    upload = make_upload("cover.txt", "text/plain", b"plain text")

    with pytest.raises(Exception) as exc_info:
        _validate_cover_upload(upload)

    assert "Unsupported cover image extension" in str(exc_info.value)


def test_validate_cover_upload_rejects_mismatched_content():
    upload = make_upload("cover.png", "image/png", b"\xff\xd8\xffjpeg")

    with pytest.raises(Exception) as exc_info:
        _validate_cover_upload(upload)

    assert "Cover image content does not match extension" in str(exc_info.value)
