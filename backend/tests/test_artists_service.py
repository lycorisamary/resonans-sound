from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.schemas import ArtistProfileUpdate
from app.services import artists as artists_service


def make_user():
    now = datetime.now(timezone.utc)
    return SimpleNamespace(
        id=7,
        username="artist",
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
        user=make_user(),
        track_count=3,
        play_count=40,
        like_count=5,
    )

    assert response.username == "artist"
    assert response.display_name == "Artist Name"
    assert response.track_count == 3
    assert response.play_count == 40
    assert response.profile_genres == ["Ambient", "Pop"]
    assert response.social_links == {"telegram": "https://t.me/artist"}


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
