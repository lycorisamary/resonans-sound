from enum import Enum as PyEnum

from sqlalchemy import ARRAY, JSON, BigInteger, Boolean, Column, DateTime, Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


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


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    username = Column(String(100), unique=True, nullable=False, index=True)
    role = Column(Enum(UserRole, name="user_role"), default=UserRole.user)
    avatar_url = Column(Text)
    bio = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login = Column(DateTime(timezone=True))
    status = Column(Enum(UserStatus, name="user_status"), default=UserStatus.active, index=True)
    email_verified = Column(Boolean, default=False)
    verification_token = Column(String(255))
    reset_token = Column(String(255))
    reset_token_expires = Column(DateTime(timezone=True))

    tracks = relationship("Track", back_populates="user", cascade="all, delete-orphan")
    interactions = relationship(
        "Interaction",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="Interaction.user_id",
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

    tracks = relationship("Track", back_populates="category")


class Track(Base):
    __tablename__ = "tracks"
    __table_args__ = (
        Index("ix_tracks_status_created_at", "status", "created_at"),
    )

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
    cover_image_url = Column(Text)
    waveform_data_json = Column(JSON)
    metadata_json = Column(JSON)
    status = Column(Enum(TrackStatus, name="track_status"), default=TrackStatus.pending, index=True)
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

    user = relationship("User", back_populates="tracks")
    category = relationship("Category", back_populates="tracks")
    interactions = relationship("Interaction", back_populates="track", cascade="all, delete-orphan")


class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    track_id = Column(Integer, ForeignKey("tracks.id", ondelete="CASCADE"), index=True)
    target_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    type = Column(Enum(InteractionType, name="interaction_type"), nullable=False, index=True)
    content = Column(Text)
    parent_id = Column(Integer, ForeignKey("interactions.id", ondelete="CASCADE"))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_deleted = Column(Boolean, default=False)

    user = relationship("User", back_populates="interactions", foreign_keys=[user_id])
    target_user = relationship("User", foreign_keys=[target_user_id])
    track = relationship("Track", back_populates="interactions")
    parent = relationship("Interaction", remote_side=[id], backref="replies")

    __table_args__ = (
        Index(
            "uq_interactions_active_like_per_user_track",
            "user_id",
            "track_id",
            unique=True,
            postgresql_where=(type == InteractionType.like) & (is_deleted.is_(False)),
        ),
    )


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
