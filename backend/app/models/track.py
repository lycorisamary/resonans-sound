from enum import Enum as PyEnum

from sqlalchemy import ARRAY, JSON, BigInteger, Boolean, Column, DateTime, Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


class TrackStatus(str, PyEnum):
    pending = "pending"
    processing = "processing"
    approved = "approved"
    rejected = "rejected"
    hidden = "hidden"
    deleted = "deleted"


class Track(Base):
    __tablename__ = "tracks"
    __table_args__ = (
        Index("ix_tracks_status_created_at", "status", "created_at"),
        Index("ix_tracks_category_status", "category_id", "status"),
        Index("ix_tracks_user_created_at", "user_id", "created_at"),
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
