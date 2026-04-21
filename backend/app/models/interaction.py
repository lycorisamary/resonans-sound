from enum import Enum as PyEnum

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Index, Integer, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


class InteractionType(str, PyEnum):
    like = "like"
    comment = "comment"
    repost = "repost"
    follow = "follow"


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
        Index("ix_interactions_track_type", "track_id", "type"),
        Index("ix_interactions_user_type", "user_id", "type"),
    )
