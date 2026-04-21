"""Add domain integrity indexes for iteration 3.

Revision ID: 20260421_000003
Revises: 20260420_000002
Create Date: 2026-04-21 10:00:00
"""
from __future__ import annotations

from alembic import op


revision = "20260421_000003"
down_revision = "20260420_000002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE INDEX IF NOT EXISTS ix_tracks_category_status ON tracks (category_id, status)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_tracks_user_created_at ON tracks (user_id, created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_interactions_track_type ON interactions (track_id, type)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_interactions_user_type ON interactions (user_id, type)")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_api_tokens_user_type_revoked "
        "ON api_tokens (user_id, token_type, is_revoked)"
    )

    op.execute(
        """
        WITH ranked_follows AS (
            SELECT
                id,
                ROW_NUMBER() OVER (
                    PARTITION BY follower_id, following_id
                    ORDER BY created_at DESC NULLS LAST, id DESC
                ) AS row_number
            FROM follows
        )
        DELETE FROM follows
        USING ranked_follows
        WHERE follows.id = ranked_follows.id
          AND ranked_follows.row_number > 1
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_follows_follower_following
        ON follows (follower_id, following_id)
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_follows_follower_following")
    op.execute("DROP INDEX IF EXISTS ix_api_tokens_user_type_revoked")
    op.execute("DROP INDEX IF EXISTS ix_interactions_user_type")
    op.execute("DROP INDEX IF EXISTS ix_interactions_track_type")
    op.execute("DROP INDEX IF EXISTS ix_tracks_user_created_at")
    op.execute("DROP INDEX IF EXISTS ix_tracks_category_status")
