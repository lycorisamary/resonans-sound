"""Add MVP runtime indexes and active-like uniqueness.

Revision ID: 20260420_000002
Revises: 20260420_000001
Create Date: 2026-04-20 21:10:00
"""
from __future__ import annotations

from alembic import op


revision = "20260420_000002"
down_revision = "20260420_000001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE INDEX IF NOT EXISTS ix_tracks_status_created_at ON tracks (status, created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_tracks_category_id ON tracks (category_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_interactions_track_id ON interactions (track_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_interactions_user_id ON interactions (user_id)")

    op.execute(
        """
        WITH ranked_likes AS (
            SELECT
                id,
                ROW_NUMBER() OVER (
                    PARTITION BY user_id, track_id
                    ORDER BY updated_at DESC NULLS LAST, id DESC
                ) AS row_number
            FROM interactions
            WHERE type = 'like'
              AND is_deleted = false
              AND track_id IS NOT NULL
        )
        UPDATE interactions
        SET is_deleted = true,
            updated_at = NOW()
        FROM ranked_likes
        WHERE interactions.id = ranked_likes.id
          AND ranked_likes.row_number > 1
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_interactions_active_like_per_user_track
        ON interactions (user_id, track_id)
        WHERE type = 'like'
          AND is_deleted = false
          AND track_id IS NOT NULL
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_interactions_active_like_per_user_track")
    op.execute("DROP INDEX IF EXISTS ix_interactions_user_id")
    op.execute("DROP INDEX IF EXISTS ix_interactions_track_id")
    op.execute("DROP INDEX IF EXISTS ix_tracks_category_id")
    op.execute("DROP INDEX IF EXISTS ix_tracks_status_created_at")
