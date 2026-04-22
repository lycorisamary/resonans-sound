from enum import Enum as PyEnum

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


class ReportReason(str, PyEnum):
    spam = "spam"
    copyright = "copyright"
    offensive = "offensive"
    not_music = "not_music"
    other = "other"


class ReportStatus(str, PyEnum):
    open = "open"
    reviewed = "reviewed"
    dismissed = "dismissed"
    resolved = "resolved"


class Report(Base):
    __tablename__ = "reports"
    __table_args__ = (
        Index("ix_reports_track_status", "track_id", "status"),
        Index("ix_reports_created_at", "created_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    track_id = Column(Integer, ForeignKey("tracks.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    reason = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(50), nullable=False, default=ReportStatus.open.value, index=True)
    moderator_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True))
    resolution_notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    reporter = relationship("User", foreign_keys=[reporter_id])
    moderator = relationship("User", foreign_keys=[moderator_id])
    track = relationship("Track")
