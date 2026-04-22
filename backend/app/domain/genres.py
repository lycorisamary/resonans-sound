SUPPORTED_TRACK_GENRES = (
    "Ambient",
    "Disco",
    "Drum & Bass",
    "Dubstep",
    "Electronic",
    "Folk & Singer-Songwriter",
    "Hip-hop & Rap",
    "House",
    "Indie",
    "Jazz & Blues",
    "Latin",
    "Metal",
    "Piano",
    "Pop",
    "R&B & Soul",
    "Reggae",
    "Reggaeton",
    "Rock",
    "Soundtrack",
    "Speech",
    "Techno",
    "Trance",
    "Trap",
    "Triphop",
    "World",
)

_GENRES_BY_KEY = {genre.lower(): genre for genre in SUPPORTED_TRACK_GENRES}


def normalize_supported_genre(value: str | None) -> str | None:
    if value is None:
        return None

    cleaned = value.strip()
    if not cleaned:
        return None

    return _GENRES_BY_KEY.get(cleaned.lower())

