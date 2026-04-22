from sqlalchemy import ARRAY, JSON, Boolean, Column, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


class Artist(Base):
    __tablename__ = "artists"
    __table_args__ = (
        Index("ix_artists_slug", "slug", unique=True),
        Index("ix_artists_user_id", "user_id", unique=True),
        Index("ix_artists_public_created_at", "is_public", "created_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    slug = Column(String(100), nullable=False)
    display_name = Column(String(120), nullable=False)
    bio = Column(Text)
    location = Column(String(120))
    profile_genres = Column(ARRAY(String))
    social_links = Column(JSON)
    streaming_links = Column(JSON)
    avatar_url = Column(Text)
    avatar_storage_key = Column(Text)
    avatar_content_type = Column(String(100))
    banner_image_url = Column(Text)
    banner_storage_key = Column(Text)
    banner_content_type = Column(String(100))
    is_public = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="artist_profile")
    tracks = relationship("Track", back_populates="artist")
