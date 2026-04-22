from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.exceptions import CollectionConflictError
from app.models import TrackStatus, UserRole
from app.schemas import CollectionCreate, CollectionTrackAdd, CollectionTrackReorder, CollectionUpdate
from app.services import collections as collections_service


class FakeDB:
    def add(self, item):
        return None

    def commit(self):
        return None

    def flush(self):
        return None

    def refresh(self, item):
        return None


def make_track(track_id: int, status: TrackStatus = TrackStatus.approved):
    now = datetime.now(timezone.utc)
    return SimpleNamespace(
        id=track_id,
        user_id=7,
        artist_id=4,
        title=f"Track {track_id}",
        description=None,
        genre=None,
        category_id=None,
        duration_seconds=30,
        file_size_bytes=1024,
        original_url=None,
        mp3_128_url=None,
        mp3_320_url=None,
        cover_image_url=f"/api/v1/tracks/{track_id}/cover",
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
        rejection_reason=None,
        user=None,
        artist=None,
        category=None,
    )


def make_collection(track_links=None, is_public=False):
    now = datetime.now(timezone.utc)
    return SimpleNamespace(
        id=3,
        user_id=1,
        name="Staff Picks",
        description=None,
        cover_image_url=None,
        is_public=is_public,
        track_count=len(track_links or []),
        created_at=now,
        updated_at=now,
        track_links=track_links or [],
    )


def make_link(track, sort_order: int):
    return SimpleNamespace(id=sort_order, track_id=track.id, sort_order=sort_order, track=track)


def make_admin():
    return SimpleNamespace(id=1, role=UserRole.admin)


def test_public_collection_serialization_filters_non_approved_tracks():
    approved_track = make_track(10, TrackStatus.approved)
    hidden_track = make_track(11, TrackStatus.hidden)
    collection = make_collection(
        track_links=[
            make_link(hidden_track, 1),
            make_link(approved_track, 2),
        ],
        is_public=True,
    )

    response = collections_service.serialize_collection(collection, public_only=True, include_tracks=True)

    assert response.track_count == 1
    assert [track.id for track in response.tracks] == [approved_track.id]
    assert response.cover_image_url == approved_track.cover_image_url


def test_collection_serialization_prefers_explicit_collection_cover():
    approved_track = make_track(10, TrackStatus.approved)
    collection = make_collection(track_links=[make_link(approved_track, 1)], is_public=True)
    collection.cover_image_url = "/api/v1/collections/3/cover"

    response = collections_service.serialize_collection(collection, public_only=True, include_tracks=True)

    assert response.cover_image_url == "/api/v1/collections/3/cover"


def test_create_collection_rejects_public_empty_collection():
    with pytest.raises(CollectionConflictError):
        collections_service.create_collection(
            db=FakeDB(),
            admin_user=make_admin(),
            payload=CollectionCreate(name="Empty public", is_public=True),
        )


def test_publish_collection_requires_approved_track(monkeypatch):
    collection = make_collection(is_public=False)
    monkeypatch.setattr(collections_service, "_get_collection_for_staff", lambda db, collection_id: collection)
    monkeypatch.setattr(collections_service, "_count_collection_approved_tracks", lambda db, collection_id: 0)

    with pytest.raises(CollectionConflictError):
        collections_service.update_collection(
            db=FakeDB(),
            admin_user=make_admin(),
            collection_id=collection.id,
            payload=CollectionUpdate(is_public=True),
        )


def test_add_collection_track_rejects_duplicates(monkeypatch):
    collection = make_collection(is_public=False)
    track = make_track(10)
    monkeypatch.setattr(collections_service, "_get_collection_for_staff", lambda db, collection_id: collection)
    monkeypatch.setattr(collections_service, "_get_track_for_collection", lambda db, track_id: track)
    monkeypatch.setattr(collections_service, "_collection_contains_track", lambda db, collection_id, track_id: True)

    with pytest.raises(CollectionConflictError):
        collections_service.add_collection_track(
            db=FakeDB(),
            admin_user=make_admin(),
            collection_id=collection.id,
            payload=CollectionTrackAdd(track_id=track.id),
        )


def test_reorder_payload_rejects_duplicate_track_ids():
    with pytest.raises(ValidationError):
        CollectionTrackReorder(track_ids=[10, 10])
