from types import SimpleNamespace

import pytest

from app.services.tracks import _build_track_upload_metadata, _validate_upload


def test_validate_upload_accepts_supported_audio():
    upload = SimpleNamespace(filename="demo-track.mp3", content_type="audio/mpeg")

    safe_filename, content_type = _validate_upload(upload)

    assert safe_filename == "demo-track.mp3"
    assert content_type == "audio/mpeg"


def test_validate_upload_rejects_unsupported_extension():
    upload = SimpleNamespace(filename="not-a-track.txt", content_type="text/plain")

    with pytest.raises(Exception) as exc_info:
        _validate_upload(upload)

    assert "Unsupported audio file extension" in str(exc_info.value)


def test_build_track_upload_metadata_contains_storage_and_processing_state():
    metadata = _build_track_upload_metadata(
        current_metadata={"existing": "value"},
        original_object_key="tracks/7/original.wav",
        file_size_bytes=12345,
        original_filename="song.wav",
        content_type="audio/wav",
    )

    assert metadata["existing"] == "value"
    assert metadata["file_size_bytes"] == 12345
    assert metadata["upload"]["original_filename"] == "song.wav"
    assert metadata["storage"]["original_object_key"] == "tracks/7/original.wav"
    assert metadata["processing"]["status"] == "queued"
