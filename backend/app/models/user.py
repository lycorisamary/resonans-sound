from enum import Enum as PyEnum

from sqlalchemy import ARRAY, JSON, Boolean, Column, DateTime, Enum, Integer, String, Text
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


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    username = Column(String(100), unique=True, nullable=False, index=True)
    display_name = Column(String(120))
    role = Column(Enum(UserRole, name="user_role"), default=UserRole.user)
    avatar_url = Column(Text)
    avatar_storage_key = Column(Text)
    avatar_content_type = Column(String(100))
    banner_image_url = Column(Text)
    banner_storage_key = Column(Text)
    banner_content_type = Column(String(100))
    bio = Column(Text)
    location = Column(String(120))
    profile_genres = Column(ARRAY(String))
    social_links = Column(JSON)
    streaming_links = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login = Column(DateTime(timezone=True))
    status = Column(Enum(UserStatus, name="user_status"), default=UserStatus.active, index=True)
    email_verified = Column(Boolean, default=False)
    verification_token = Column(String(255))
    reset_token = Column(String(255))
    reset_token_expires = Column(DateTime(timezone=True))

    tracks = relationship("Track", back_populates="user", cascade="all, delete-orphan")
    artist_profile = relationship("Artist", back_populates="user", uselist=False, cascade="all, delete-orphan")
    interactions = relationship(
        "Interaction",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="Interaction.user_id",
    )
