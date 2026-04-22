from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.sql import func

from app.db.session import Base


class TrackPlayEvent(Base):
    __tablename__ = "track_play_events"
    __table_args__ = (
        Index("ix_track_play_events_track_listener_created", "track_id", "listener_hash", "created_at"),
        Index("ix_track_play_events_user_created", "user_id", "created_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    track_id = Column(Integer, ForeignKey("tracks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    listener_hash = Column(String(64), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
