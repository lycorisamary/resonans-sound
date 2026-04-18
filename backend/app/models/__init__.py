from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum, BigInteger, ARRAY, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum as PyEnum
from app.db.session import Base


# Enum types
class UserRole(str, PyEnum):
    user = "user"
    moderator = "moderator"
    admin = "admin"


class UserStatus(str, PyEnum):
    active = "active"
    inactive = "inactive"
    banned = "banned"


class TrackStatus(str, PyEnum):
    pending = "pending"
    processing = "processing"
    approved = "approved"
    rejected = "rejected"
    deleted = "deleted"


class InteractionType(str, PyEnum):
    like = "like"
    comment = "comment"
    repost = "repost"
    follow = "follow"


# Models
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    username = Column(String(100), unique=True, nullable=False, index=True)
    role = Column(Enum(UserRole), default=UserRole.user)
    avatar_url = Column(Text)
    bio = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login = Column(DateTime(timezone=True))
    status = Column(Enum(UserStatus), default=UserStatus.active, index=True)
    email_verified = Column(Boolean, default=False)
    verification_token = Column(String(255))
    reset_token = Column(String(255))
    reset_token_expires = Column(DateTime(timezone=True))

    # Relationships
    tracks = relationship("Track", back_populates="user", cascade="all, delete-orphan")
    playlists = relationship("Playlist", back_populates="user", cascade="all, delete-orphan")
    interactions = relationship(
        "Interaction",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="Interaction.user_id",
    )
    notifications = relationship(
        "Notification",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="Notification.user_id",
    )
    
    # Follow relationships
    followers = relationship(
        "Follow",
        foreign_keys="[Follow.following_id]",
        back_populates="following",
        cascade="all, delete-orphan"
    )
    following = relationship(
        "Follow",
        foreign_keys="[Follow.follower_id]",
        back_populates="follower",
        cascade="all, delete-orphan"
    )


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    tracks = relationship("Track", back_populates="category")


class Track(Base):
    __tablename__ = "tracks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    genre = Column(String(100))
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), index=True)
    duration_seconds = Column(Integer)
    file_size_bytes = Column(BigInteger)
    original_url = Column(Text)
    mp3_128_url = Column(Text)
    mp3_320_url = Column(Text)
    waveform_data_json = Column(JSON)
    metadata_json = Column(JSON)
    status = Column(Enum(TrackStatus), default=TrackStatus.pending, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    play_count = Column(Integer, default=0, index=True)
    like_count = Column(Integer, default=0, index=True)
    comment_count = Column(Integer, default=0)
    is_public = Column(Boolean, default=True, index=True)
    is_downloadable = Column(Boolean, default=False)
    license_type = Column(String(50), default="all-rights-reserved")
    tags = Column(ARRAY(String))
    bpm = Column(Integer)
    key_signature = Column(String(20))
    rejection_reason = Column(Text)

    # Relationships
    user = relationship("User", back_populates="tracks")
    category = relationship("Category", back_populates="tracks")
    interactions = relationship("Interaction", back_populates="track", cascade="all, delete-orphan")
    playlist_tracks = relationship("PlaylistTrack", back_populates="track", cascade="all, delete-orphan")


class Playlist(Base):
    __tablename__ = "playlists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    cover_image_url = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_public = Column(Boolean, default=True)
    track_count = Column(Integer, default=0)

    # Relationships
    user = relationship("User", back_populates="playlists")
    playlist_tracks = relationship("PlaylistTrack", back_populates="playlist", cascade="all, delete-orphan")


class PlaylistTrack(Base):
    __tablename__ = "playlist_tracks"

    id = Column(Integer, primary_key=True, index=True)
    playlist_id = Column(Integer, ForeignKey("playlists.id", ondelete="CASCADE"), nullable=False, index=True)
    track_id = Column(Integer, ForeignKey("tracks.id", ondelete="CASCADE"), nullable=False, index=True)
    sort_order = Column(Integer, default=0)
    added_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    playlist = relationship("Playlist", back_populates="playlist_tracks")
    track = relationship("Track", back_populates="playlist_tracks")


class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    track_id = Column(Integer, ForeignKey("tracks.id", ondelete="CASCADE"), index=True)
    target_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    type = Column(Enum(InteractionType), nullable=False, index=True)
    content = Column(Text)
    parent_id = Column(Integer, ForeignKey("interactions.id", ondelete="CASCADE"))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_deleted = Column(Boolean, default=False)

    # Relationships
    user = relationship("User", back_populates="interactions", foreign_keys=[user_id])
    target_user = relationship("User", foreign_keys=[target_user_id])
    track = relationship("Track", back_populates="interactions")
    parent = relationship("Interaction", remote_side=[id], backref="replies")


class Follow(Base):
    __tablename__ = "follows"

    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    following_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    follower = relationship("User", foreign_keys=[follower_id], back_populates="following")
    following = relationship("User", foreign_keys=[following_id], back_populates="followers")


class AdminLog(Base):
    __tablename__ = "admin_logs"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String(100), nullable=False)
    target_type = Column(String(50))
    target_id = Column(Integer)
    details = Column(JSON)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    ip_address = Column(String(45))
    user_agent = Column(Text)


class APIToken(Base):
    __tablename__ = "api_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(255), nullable=False, index=True)
    token_type = Column(String(50), nullable=False)
    expires_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_used_at = Column(DateTime(timezone=True))
    is_revoked = Column(Boolean, default=False)
    description = Column(String(255))
    permissions = Column(JSON)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    related_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    related_track_id = Column(Integer, ForeignKey("tracks.id", ondelete="SET NULL"))
    related_interaction_id = Column(Integer, ForeignKey("interactions.id", ondelete="SET NULL"))
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="notifications", foreign_keys=[user_id])
    related_user = relationship("User", foreign_keys=[related_user_id])
    related_track = relationship("Track", foreign_keys=[related_track_id])
    related_interaction = relationship("Interaction", foreign_keys=[related_interaction_id])


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    track_id = Column(Integer, ForeignKey("tracks.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    reason = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(50), default="pending", index=True)
    moderator_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    reviewed_at = Column(DateTime(timezone=True))
    resolution_notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(50), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    track_id = Column(Integer, ForeignKey("tracks.id", ondelete="SET NULL"))
    event_data = Column(JSON)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
