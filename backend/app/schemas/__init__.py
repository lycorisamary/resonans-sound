from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


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
    bio: Optional[str] = None
    avatar_url: Optional[str] = None


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
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    track_count: Optional[int] = 0
    follower_count: Optional[int] = 0
    following_count: Optional[int] = 0


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
