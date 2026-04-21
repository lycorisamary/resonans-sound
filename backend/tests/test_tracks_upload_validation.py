from io import BytesIO
from types import SimpleNamespace

import pytest

from app.services.tracks import _build_track_upload_metadata, _validate_upload, _write_upload_to_temp_file


def make_upload(filename: str, content_type: str, content: bytes):
    return SimpleNamespace(filename=filename, content_type=content_type, file=BytesIO(content))


def test_validate_upload_accepts_supported_audio():
    upload = make_upload("demo-track.mp3", "audio/mpeg", b"ID3\x04\x00\x00audio")

    safe_filename, content_type = _validate_upload(upload)

    assert safe_filename == "demo-track.mp3"
    assert content_type == "audio/mpeg"


def test_validate_upload_rejects_unsupported_extension():
    upload = make_upload("not-a-track.txt", "text/plain", b"ID3\x04\x00\x00audio")

    with pytest.raises(Exception) as exc_info:
        _validate_upload(upload)

    assert "Unsupported audio file extension" in str(exc_info.value)


def test_validate_upload_rejects_unrecognized_audio_content():
    upload = make_upload("demo-track.mp3", "audio/mpeg", b"not an audio file")

    with pytest.raises(Exception) as exc_info:
        _validate_upload(upload)

    assert "Unsupported audio file content" in str(exc_info.value)


def test_validate_upload_rejects_content_extension_mismatch():
    upload = make_upload("demo-track.mp3", "audio/mpeg", b"RIFF\x24\x00\x00\x00WAVEfmt ")

    with pytest.raises(Exception) as exc_info:
        _validate_upload(upload)

    assert "Audio file content does not match extension" in str(exc_info.value)


def test_write_upload_to_temp_file_rejects_empty_file():
    upload = make_upload("demo-track.mp3", "audio/mpeg", b"")

    with pytest.raises(Exception) as exc_info:
        _write_upload_to_temp_file(upload, suffix=".mp3", max_file_size=128)

    assert "Empty files cannot be uploaded" in str(exc_info.value)


def test_write_upload_to_temp_file_rejects_oversize_file():
    upload = make_upload("demo-track.mp3", "audio/mpeg", b"x" * 5)

    with pytest.raises(Exception) as exc_info:
        _write_upload_to_temp_file(upload, suffix=".mp3", max_file_size=4)

    assert "File exceeds max size" in str(exc_info.value)


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
