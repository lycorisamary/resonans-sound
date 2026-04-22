from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.schemas import ArtistProfileUpdate, TrackCreate
from app.services import artists as artists_service


def make_artist():
    now = datetime.now(timezone.utc)
    user = SimpleNamespace(id=7, username="user_account")
    return SimpleNamespace(
        id=3,
        user_id=user.id,
        slug="artist",
        user=user,
        display_name="Artist Name",
        avatar_url="/api/v1/artists/artist/avatar",
        banner_image_url="/api/v1/artists/artist/banner",
        bio="Independent artist",
        location="Kaliningrad",
        profile_genres=["Ambient", "Pop"],
        social_links={"telegram": "https://t.me/artist"},
        streaming_links={"soundcloud": "https://soundcloud.com/artist"},
        created_at=now,
    )


def test_artist_profile_serialization_includes_public_stats_and_links():
    response = artists_service.serialize_artist_profile(
        artist=make_artist(),
        track_count=3,
        play_count=40,
        like_count=5,
    )

    assert response.slug == "artist"
    assert response.username == "user_account"
    assert response.display_name == "Artist Name"
    assert response.track_count == 3
    assert response.play_count == 40
    assert response.profile_genres == ["Ambient", "Pop"]
    assert response.social_links == {"telegram": "https://t.me/artist"}


def test_artist_discovery_sort_normalization():
    assert artists_service.normalize_artist_discovery_sort("popular") == "popular"
    assert artists_service.normalize_artist_discovery_sort(" NEWEST ") == "newest"
    assert artists_service.normalize_artist_discovery_sort("unknown") == "recommended"


def test_artist_profile_update_rejects_unsupported_link_keys():
    with pytest.raises(ValidationError):
        ArtistProfileUpdate(social_links={"unsafe": "https://example.com"})


def test_artist_profile_update_rejects_non_http_links():
    with pytest.raises(ValidationError):
        ArtistProfileUpdate(streaming_links={"soundcloud": "javascript:alert(1)"})


def test_artist_profile_update_cleans_genres_and_text():
    payload = ArtistProfileUpdate(
        display_name="  Demo Artist  ",
        bio="  ",
        profile_genres=["Ambient", " ambient ", "", "Pop"],
    )

    assert payload.display_name == "Demo Artist"
    assert payload.bio is None
    assert payload.profile_genres == ["Ambient", "Pop"]


def test_artist_profile_update_rejects_unsupported_genres():
    with pytest.raises(ValidationError):
        ArtistProfileUpdate(profile_genres=["Ambient", "Future Genre"])


def test_track_create_rejects_unsupported_genre():
    with pytest.raises(ValidationError):
        TrackCreate(title="Demo", genre="Future Genre")


def test_track_create_normalizes_supported_genre_case():
    payload = TrackCreate(title="Demo", genre="hip-hop & rap")

    assert payload.genre == "Hip-hop & Rap"
