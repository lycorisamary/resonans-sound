"""Add track play events for listen-threshold counters.

Revision ID: 20260422_000005
Revises: 20260422_000004
Create Date: 2026-04-22 12:00:00
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260422_000005"
down_revision = "20260422_000004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "track_play_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("track_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("listener_hash", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["track_id"], ["tracks.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_track_play_events_id", "track_play_events", ["id"], unique=False)
    op.create_index("ix_track_play_events_track_id", "track_play_events", ["track_id"], unique=False)
    op.create_index("ix_track_play_events_user_id", "track_play_events", ["user_id"], unique=False)
    op.create_index("ix_track_play_events_listener_hash", "track_play_events", ["listener_hash"], unique=False)
    op.create_index("ix_track_play_events_created_at", "track_play_events", ["created_at"], unique=False)
    op.create_index(
        "ix_track_play_events_track_listener_created",
        "track_play_events",
        ["track_id", "listener_hash", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_track_play_events_user_created",
        "track_play_events",
        ["user_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_track_play_events_user_created", table_name="track_play_events")
    op.drop_index("ix_track_play_events_track_listener_created", table_name="track_play_events")
    op.drop_index("ix_track_play_events_created_at", table_name="track_play_events")
    op.drop_index("ix_track_play_events_listener_hash", table_name="track_play_events")
    op.drop_index("ix_track_play_events_user_id", table_name="track_play_events")
    op.drop_index("ix_track_play_events_track_id", table_name="track_play_events")
    op.drop_index("ix_track_play_events_id", table_name="track_play_events")
    op.drop_table("track_play_events")
