from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from typing import Dict, List, Optional
from datetime import datetime
from enum import Enum
from urllib.parse import urlparse
import re


# Enums for schemas
class UserRoleEnum(str, Enum):
    user = "user"
    moderator = "moderator"
    admin = "admin"


class UserStatusEnum(str, Enum):
    active = "active"
    inactive = "inactive"
    banned = "banned"


class TrackStatusEnum(str, Enum):
    pending = "pending"
    processing = "processing"
    approved = "approved"
    rejected = "rejected"
    hidden = "hidden"
    deleted = "deleted"


class TrackModerationStatusEnum(str, Enum):
    approved = "approved"
    rejected = "rejected"
    hidden = "hidden"


# Auth Schemas
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    username: str = Field(..., min_length=3, max_length=50)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None
    username: Optional[str] = None
    role: Optional[str] = None


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    display_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    banner_image_url: Optional[str] = None


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: UserRoleEnum
    status: UserStatusEnum
    created_at: datetime
    email_verified: bool


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    banner_image_url: Optional[str] = None
    bio: Optional[str] = None
    track_count: Optional[int] = 0
    follower_count: Optional[int] = 0
    following_count: Optional[int] = 0


SOCIAL_LINK_KEYS = {"instagram", "telegram", "vk", "youtube", "tiktok", "x", "website"}
STREAMING_LINK_KEYS = {"soundcloud", "spotify", "apple_music", "youtube_music", "bandcamp", "yandex_music", "vk_music"}
ARTIST_SLUG_PATTERN = re.compile(r"^[a-z0-9][a-z0-9_-]{2,49}$")


def _clean_optional_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _validate_profile_links(value: Optional[Dict[str, str]], allowed_keys: set[str], field_name: str) -> Optional[Dict[str, str]]:
    if value is None:
        return None

    cleaned: Dict[str, str] = {}
    for key, raw_url in value.items():
        normalized_key = key.strip().lower()
        if normalized_key not in allowed_keys:
            raise ValueError(f"Unsupported {field_name} key: {key}")

        url = raw_url.strip()
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError(f"{field_name} values must be absolute http(s) URLs")
        cleaned[normalized_key] = url

    return cleaned


class ArtistProfileUpdate(BaseModel):
    display_name: Optional[str] = Field(None, max_length=120)
    bio: Optional[str] = Field(None, max_length=2000)
    location: Optional[str] = Field(None, max_length=120)
    profile_genres: Optional[List[str]] = Field(None, max_length=12)
    social_links: Optional[Dict[str, str]] = None
    streaming_links: Optional[Dict[str, str]] = None

    @field_validator("display_name", "bio", "location")
    @classmethod
    def clean_profile_text(cls, value):
        return _clean_optional_text(value)

    @field_validator("profile_genres")
    @classmethod
    def clean_profile_genres(cls, value):
        if value is None:
            return None
        cleaned = []
        for item in value:
            genre = item.strip()
            if not genre:
                continue
            if len(genre) > 60:
                raise ValueError("Profile genre is too long")
            if genre.lower() not in {existing.lower() for existing in cleaned}:
                cleaned.append(genre)
        return cleaned

    @field_validator("social_links")
    @classmethod
    def validate_social_links(cls, value):
        return _validate_profile_links(value, SOCIAL_LINK_KEYS, "social_links")

    @field_validator("streaming_links")
    @classmethod
    def validate_streaming_links(cls, value):
        return _validate_profile_links(value, STREAMING_LINK_KEYS, "streaming_links")


class ArtistProfileCreate(ArtistProfileUpdate):
    slug: str = Field(..., min_length=3, max_length=50)
    display_name: str = Field(..., min_length=1, max_length=120)

    @field_validator("slug")
    @classmethod
    def validate_artist_slug(cls, value):
        slug = value.strip().lower()
        if not ARTIST_SLUG_PATTERN.match(slug):
            raise ValueError("Artist slug must contain lowercase letters, numbers, underscores, or hyphens")
        return slug

    @field_validator("display_name")
    @classmethod
    def validate_artist_display_name(cls, value):
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Artist display name must not be blank")
        return cleaned


class ArtistProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    slug: str
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    banner_image_url: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    profile_genres: List[str] = Field(default_factory=list)
    social_links: Dict[str, str] = Field(default_factory=dict)
    streaming_links: Dict[str, str] = Field(default_factory=dict)
    track_count: int = 0
    play_count: int = 0
    like_count: int = 0
    created_at: datetime


class ArtistPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    display_name: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None


# Active category schemas
class CategoryBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    slug: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    sort_order: int = 0

class CategoryResponse(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: datetime
    track_count: Optional[int] = 0


# Track Schemas
class TrackBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    genre: Optional[str] = Field(None, max_length=100)
    category_id: Optional[int] = None
    is_public: bool = True
    is_downloadable: bool = False
    license_type: str = "all-rights-reserved"
    tags: Optional[List[str]] = None
    bpm: Optional[int] = None
    key_signature: Optional[str] = Field(None, max_length=20)


class TrackCreate(TrackBase):
    pass


class TrackUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    genre: Optional[str] = None
    category_id: Optional[int] = None
    is_public: Optional[bool] = None
    is_downloadable: Optional[bool] = None
    license_type: Optional[str] = None
    tags: Optional[List[str]] = None
    bpm: Optional[int] = None
    key_signature: Optional[str] = None


class TrackMetadata(BaseModel):
    duration_seconds: Optional[int] = None
    file_size_bytes: Optional[int] = None
    bitrate: Optional[int] = None
    sample_rate: Optional[int] = None
    channels: Optional[int] = None
    format: Optional[str] = None


class TrackResponse(TrackBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    artist_id: int
    status: TrackStatusEnum
    created_at: datetime
    updated_at: datetime
    play_count: int
    like_count: int
    comment_count: int
    duration_seconds: Optional[int] = None
    cover_image_url: Optional[str] = None
    waveform_data_json: Optional[dict] = None
    metadata: Optional[TrackMetadata] = None
    user: Optional[UserPublic] = None
    artist: Optional[ArtistPublic] = None
    category: Optional[CategoryResponse] = None


class TrackUploadResponse(TrackResponse):
    original_url: Optional[str] = None
    mp3_128_url: Optional[str] = None
    mp3_320_url: Optional[str] = None
    rejection_reason: Optional[str] = None


class StreamUrlResponse(BaseModel):
    url: str
    quality: str
    expires_at: Optional[datetime] = None


class LikeToggleResponse(BaseModel):
    track_id: int
    liked: bool
    like_count: int


class TrackLikeListResponse(BaseModel):
    track_ids: List[int]


class TrackPlayCreate(BaseModel):
    track_id: int = Field(..., gt=0)


class TrackPlayResponse(BaseModel):
    track_id: int
    counted: bool
    play_count: int
    dedupe_window_seconds: int


# Collection Schemas
class CollectionBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    is_public: bool = False

    @field_validator("name")
    @classmethod
    def collection_name_not_blank(cls, value):
        if not value.strip():
            raise ValueError("Collection name must not be blank")
        return value


class CollectionCreate(CollectionBase):
    pass


class CollectionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_public: Optional[bool] = None

    @field_validator("name")
    @classmethod
    def collection_update_name_not_blank(cls, value):
        if value is not None and not value.strip():
            raise ValueError("Collection name must not be blank")
        return value


class CollectionTrackAdd(BaseModel):
    track_id: int = Field(..., gt=0)


class CollectionTrackReorder(BaseModel):
    track_ids: List[int] = Field(..., min_length=1)

    @field_validator("track_ids")
    @classmethod
    def track_ids_must_be_unique(cls, value):
        if len(value) != len(set(value)):
            raise ValueError("track_ids must be unique")
        if any(track_id <= 0 for track_id in value):
            raise ValueError("track_ids must contain positive ids")
        return value


class CollectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    is_public: bool
    track_count: int
    created_at: datetime
    updated_at: datetime
    tracks: List[TrackResponse] = Field(default_factory=list)


# Admin Schemas
class AdminLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    admin_id: int
    action: str
    target_type: str
    target_id: Optional[int] = None
    timestamp: datetime
    ip_address: Optional[str] = None
    details: Optional[dict] = None

class TrackModeration(BaseModel):
    status: TrackModerationStatusEnum
    rejection_reason: Optional[str] = None


class SystemStats(BaseModel):
    total_users: int
    total_tracks: int
    total_plays: int
    total_likes: int
    active_users_today: int
    new_users_today: int
    tracks_pending_moderation: int
    tracks_hidden: int


class PaginatedResponse(BaseModel):
    items: List
    total: int
    page: int
    size: int
    pages: int


# Future-only schemas for playlists/comments/follows/reports are intentionally
# excluded from the active MVP runtime until those APIs are reintroduced.
