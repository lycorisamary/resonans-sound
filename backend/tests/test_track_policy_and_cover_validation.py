from types import SimpleNamespace

import pytest

from app.models import UserRole
from app.services.tracks import _can_delete_track, _validate_cover_upload


def make_user(user_id: int, role: UserRole = UserRole.user):
    return SimpleNamespace(id=user_id, role=role)


def make_track(user_id: int):
    return SimpleNamespace(user_id=user_id)


def test_track_delete_policy_allows_owner_and_staff():
    track = make_track(user_id=42)

    assert _can_delete_track(track, make_user(user_id=42))
    assert _can_delete_track(track, make_user(user_id=7, role=UserRole.admin))
    assert _can_delete_track(track, make_user(user_id=8, role=UserRole.moderator))
    assert not _can_delete_track(track, make_user(user_id=99))


def test_validate_cover_upload_accepts_supported_image():
    upload = SimpleNamespace(filename="cover-art.png", content_type="image/png")

    safe_filename, content_type = _validate_cover_upload(upload)

    assert safe_filename == "cover-art.png"
    assert content_type == "image/png"


def test_validate_cover_upload_rejects_unsupported_extension():
    upload = SimpleNamespace(filename="cover.txt", content_type="text/plain")

    with pytest.raises(Exception) as exc_info:
        _validate_cover_upload(upload)

    assert "Unsupported cover image extension" in str(exc_info.value)
