from pydantic import BaseModel, EmailStr, Field, validator
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
    deleted = "deleted"


class InteractionTypeEnum(str, Enum):
    like = "like"
    comment = "comment"
    repost = "repost"
    follow = "follow"


# Auth Schemas
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    username: str = Field(..., min_length=3, max_length=50)

    @validator('password')
    def password_strength(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


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


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    bio: Optional[str] = None
    avatar_url: Optional[str] = None


class UserResponse(UserBase):
    id: int
    role: UserRoleEnum
    status: UserStatusEnum
    created_at: datetime
    email_verified: bool

    class Config:
        from_attributes = True


class UserPublic(BaseModel):
    id: int
    username: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    track_count: Optional[int] = 0
    follower_count: Optional[int] = 0
    following_count: Optional[int] = 0

    class Config:
        from_attributes = True


# Category Schemas
class CategoryBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    slug: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    sort_order: int = 0


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class CategoryResponse(CategoryBase):
    id: int
    is_active: bool
    created_at: datetime
    track_count: Optional[int] = 0

    class Config:
        from_attributes = True


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
    id: int
    user_id: int
    status: TrackStatusEnum
    created_at: datetime
    updated_at: datetime
    play_count: int
    like_count: int
    comment_count: int
    duration_seconds: Optional[int] = None
    waveform_data_json: Optional[dict] = None
    metadata: Optional[TrackMetadata] = None
    user: Optional[UserPublic] = None
    category: Optional[CategoryResponse] = None

    class Config:
        from_attributes = True


class TrackUploadResponse(TrackResponse):
    original_url: str
    mp3_128_url: Optional[str] = None
    mp3_320_url: Optional[str] = None


# Playlist Schemas
class PlaylistBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    is_public: bool = True


class PlaylistCreate(PlaylistBase):
    pass


class PlaylistUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_public: Optional[bool] = None


class PlaylistTrackAdd(BaseModel):
    track_id: int
    sort_order: Optional[int] = 0


class PlaylistResponse(PlaylistBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    track_count: int
    tracks: Optional[List[TrackResponse]] = None

    class Config:
        from_attributes = True


# Interaction Schemas
class InteractionCreate(BaseModel):
    track_id: Optional[int] = None
    type: InteractionTypeEnum
    content: Optional[str] = None
    parent_id: Optional[int] = None


class InteractionResponse(BaseModel):
    id: int
    user_id: int
    track_id: Optional[int] = None
    type: InteractionTypeEnum
    content: Optional[str] = None
    created_at: datetime
    user: Optional[UserPublic] = None

    class Config:
        from_attributes = True


class CommentCreate(BaseModel):
    track_id: int
    content: str = Field(..., min_length=1, max_length=2000)
    parent_id: Optional[int] = None


class CommentResponse(InteractionResponse):
    replies: Optional[List['CommentResponse']] = None


# Follow Schema
class FollowCreate(BaseModel):
    following_id: int


class FollowResponse(BaseModel):
    id: int
    follower_id: int
    following_id: int
    created_at: datetime
    follower: Optional[UserPublic] = None
    following: Optional[UserPublic] = None

    class Config:
        from_attributes = True


# Admin Schemas
class AdminAction(BaseModel):
    action: str
    target_type: str
    target_id: int
    reason: Optional[str] = None


class AdminLogResponse(BaseModel):
    id: int
    admin_id: int
    action: str
    target_type: str
    target_id: Optional[int] = None
    timestamp: datetime
    ip_address: Optional[str] = None

    class Config:
        from_attributes = True


class UserModeration(BaseModel):
    status: Optional[UserStatusEnum] = None
    role: Optional[UserRoleEnum] = None


class TrackModeration(BaseModel):
    status: Optional[TrackStatusEnum] = None
    rejection_reason: Optional[str] = None


# Report Schemas
class ReportCreate(BaseModel):
    track_id: Optional[int] = None
    user_id: Optional[int] = None
    reason: str = Field(..., min_length=10, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)


class ReportResponse(BaseModel):
    id: int
    reporter_id: int
    track_id: Optional[int] = None
    user_id: Optional[int] = None
    reason: str
    description: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# Analytics Schemas
class SystemStats(BaseModel):
    total_users: int
    total_tracks: int
    total_plays: int
    total_likes: int
    active_users_today: int
    new_users_today: int
    tracks_pending_moderation: int


class AnalyticsPeriod(BaseModel):
    start_date: datetime
    end_date: datetime
    plays: int
    unique_listeners: int
    top_tracks: Optional[List[dict]] = None
    top_artists: Optional[List[dict]] = None


# Pagination
class PaginationParams(BaseModel):
    page: int = 1
    size: int = 20
    sort_by: str = "created_at"
    sort_order: str = "desc"


class PaginatedResponse(BaseModel):
    items: List
    total: int
    page: int
    size: int
    pages: int
