from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


class Collection(Base):
    __tablename__ = "playlists"
    __table_args__ = (
        Index("ix_playlists_public_created_at", "is_public", "created_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    cover_image_url = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_public = Column(Boolean, default=False, index=True)
    track_count = Column(Integer, default=0)

    user = relationship("User")
    track_links = relationship(
        "CollectionTrack",
        back_populates="collection",
        cascade="all, delete-orphan",
    )


class CollectionTrack(Base):
    __tablename__ = "playlist_tracks"
    __table_args__ = (
        Index("uq_playlist_tracks_playlist_track", "playlist_id", "track_id", unique=True),
        Index("ix_playlist_tracks_playlist_order", "playlist_id", "sort_order", "id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    playlist_id = Column(Integer, ForeignKey("playlists.id", ondelete="CASCADE"), nullable=False, index=True)
    track_id = Column(Integer, ForeignKey("tracks.id", ondelete="CASCADE"), nullable=False, index=True)
    sort_order = Column(Integer, default=0)
    added_at = Column(DateTime(timezone=True), server_default=func.now())

    collection = relationship("Collection", back_populates="track_links")
    track = relationship("Track")
