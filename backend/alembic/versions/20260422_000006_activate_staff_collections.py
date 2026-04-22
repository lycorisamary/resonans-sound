"""Activate staff-managed collections.

Revision ID: 20260422_000006
Revises: 20260422_000005
Create Date: 2026-04-22 13:30:00
"""
from __future__ import annotations

from alembic import op


revision = "20260422_000006"
down_revision = "20260422_000005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("UPDATE playlists SET is_public = FALSE WHERE is_public IS NULL")
    op.execute("UPDATE playlists SET track_count = 0 WHERE track_count IS NULL")
    op.execute("UPDATE playlist_tracks SET sort_order = id WHERE sort_order IS NULL")
    op.execute(
        """
        WITH counts AS (
            SELECT playlist_id, COUNT(*) AS track_count
            FROM playlist_tracks
            GROUP BY playlist_id
        )
        UPDATE playlists
        SET track_count = counts.track_count
        FROM counts
        WHERE playlists.id = counts.playlist_id
        """
    )
    op.execute(
        """
        WITH ranked_playlist_tracks AS (
            SELECT
                id,
                ROW_NUMBER() OVER (
                    PARTITION BY playlist_id, track_id
                    ORDER BY sort_order ASC NULLS LAST, added_at ASC NULLS LAST, id ASC
                ) AS row_number
            FROM playlist_tracks
        )
        DELETE FROM playlist_tracks
        USING ranked_playlist_tracks
        WHERE playlist_tracks.id = ranked_playlist_tracks.id
          AND ranked_playlist_tracks.row_number > 1
        """
    )
    op.execute(
        """
        WITH counts AS (
            SELECT playlist_id, COUNT(*) AS track_count
            FROM playlist_tracks
            GROUP BY playlist_id
        )
        UPDATE playlists
        SET track_count = COALESCE(counts.track_count, 0)
        FROM counts
        WHERE playlists.id = counts.playlist_id
        """
    )
    op.execute(
        """
        UPDATE playlists
        SET track_count = 0
        WHERE id NOT IN (SELECT DISTINCT playlist_id FROM playlist_tracks)
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_playlist_tracks_playlist_track
        ON playlist_tracks (playlist_id, track_id)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_playlist_tracks_playlist_order
        ON playlist_tracks (playlist_id, sort_order, id)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_playlists_public_created_at
        ON playlists (is_public, created_at)
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_playlists_public_created_at")
    op.execute("DROP INDEX IF EXISTS ix_playlist_tracks_playlist_order")
    op.execute("DROP INDEX IF EXISTS uq_playlist_tracks_playlist_track")
