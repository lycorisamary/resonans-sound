from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.api import auth as auth_api
from app.api import tracks as tracks_api
from app.core.config import settings
from app.core.security import get_current_user
from app.db.session import get_db
from app.main import app
from app.schemas import StreamUrlResponse, Token
from app.services.rate_limit import rate_limiter


@pytest.fixture(autouse=True)
def reset_rate_limiter(monkeypatch):
    rate_limiter.reset()
    monkeypatch.setattr(settings, "RATE_LIMIT_ENABLED", True)
    app.dependency_overrides.clear()
    app.dependency_overrides[get_db] = lambda: object()
    yield
    app.dependency_overrides.clear()
    rate_limiter.reset()


def _client() -> TestClient:
    return TestClient(app)


def _user(user_id: int = 42):
    return SimpleNamespace(id=user_id)


def _track_upload_response():
    now = datetime.now(timezone.utc)
    return {
        "id": 7,
        "user_id": 42,
        "title": "Demo",
        "description": None,
        "genre": None,
        "category_id": None,
        "is_public": True,
        "is_downloadable": False,
        "license_type": "all-rights-reserved",
        "tags": None,
        "bpm": None,
        "key_signature": None,
        "status": "processing",
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "play_count": 0,
        "like_count": 0,
        "comment_count": 0,
        "duration_seconds": None,
        "cover_image_url": None,
        "waveform_data_json": None,
        "metadata": None,
        "user": None,
        "category": None,
        "original_url": None,
        "mp3_128_url": None,
        "mp3_320_url": None,
        "rejection_reason": None,
    }


def test_login_rate_limit_returns_429(monkeypatch):
    monkeypatch.setattr(settings, "AUTH_LOGIN_RATE_LIMIT_PER_MINUTE", 1)
    monkeypatch.setattr(
        auth_api,
        "login_user",
        lambda db, payload: Token(access_token="access", refresh_token="refresh"),
    )

    client = _client()
    payload = {"email": "alice@example.com", "password": "Password123"}
    headers = {"X-Forwarded-For": "203.0.113.10"}

    assert client.post("/api/v1/auth/login", json=payload, headers=headers).status_code == 200
    response = client.post("/api/v1/auth/login", json=payload, headers=headers)

    assert response.status_code == 429
    assert response.headers["retry-after"]
    assert response.json()["code"] == "rate_limit_exceeded"
    assert response.json()["message"] == "Too many requests. Please try again later."


def test_upload_rate_limit_returns_429(monkeypatch):
    monkeypatch.setattr(settings, "UPLOAD_RATE_LIMIT_PER_HOUR", 1)
    app.dependency_overrides[get_current_user] = lambda: _user()
    monkeypatch.setattr(tracks_api, "upload_track_source", lambda **kwargs: _track_upload_response())

    client = _client()
    files = {"file": ("demo.mp3", b"ID3\x04\x00\x00audio", "audio/mpeg")}
    data = {"track_id": "7"}

    assert client.post("/api/v1/tracks/upload", data=data, files=files).status_code == 202
    response = client.post("/api/v1/tracks/upload", data=data, files=files)

    assert response.status_code == 429
    assert response.json()["code"] == "rate_limit_exceeded"


def test_stream_url_rate_limit_returns_429(monkeypatch):
    monkeypatch.setattr(settings, "STREAM_URL_RATE_LIMIT_PER_MINUTE", 1)
    monkeypatch.setattr(
        tracks_api,
        "build_track_stream_url_response",
        lambda **kwargs: StreamUrlResponse(url="/api/v1/tracks/7/stream?quality=320", quality="320"),
    )

    client = _client()
    headers = {"X-Forwarded-For": "203.0.113.20"}

    assert client.get("/api/v1/tracks/7/stream-url", headers=headers).status_code == 200
    response = client.get("/api/v1/tracks/7/stream-url", headers=headers)

    assert response.status_code == 429
    assert response.json()["code"] == "rate_limit_exceeded"
