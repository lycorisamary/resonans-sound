"""Split artist profiles from user accounts.

Revision ID: 20260422_000009
Revises: 20260422_000008
Create Date: 2026-04-22 20:10:00
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "20260422_000009"
down_revision = "20260422_000008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "artists",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("display_name", sa.String(length=120), nullable=False),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("location", sa.String(length=120), nullable=True),
        sa.Column("profile_genres", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column("social_links", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("streaming_links", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("avatar_url", sa.Text(), nullable=True),
        sa.Column("avatar_storage_key", sa.Text(), nullable=True),
        sa.Column("avatar_content_type", sa.String(length=100), nullable=True),
        sa.Column("banner_image_url", sa.Text(), nullable=True),
        sa.Column("banner_storage_key", sa.Text(), nullable=True),
        sa.Column("banner_content_type", sa.String(length=100), nullable=True),
        sa.Column("is_public", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_artists_id", "artists", ["id"], unique=False)
    op.create_index("ix_artists_slug", "artists", ["slug"], unique=True)
    op.create_index("ix_artists_user_id", "artists", ["user_id"], unique=True)
    op.create_index("ix_artists_public_created_at", "artists", ["is_public", "created_at"], unique=False)

    op.execute(
        """
        INSERT INTO artists (
            user_id,
            slug,
            display_name,
            bio,
            location,
            profile_genres,
            social_links,
            streaming_links,
            avatar_url,
            avatar_storage_key,
            avatar_content_type,
            banner_image_url,
            banner_storage_key,
            banner_content_type,
            is_public,
            created_at,
            updated_at
        )
        SELECT
            users.id,
            users.username,
            COALESCE(NULLIF(users.display_name, ''), users.username),
            users.bio,
            users.location,
            users.profile_genres,
            users.social_links,
            users.streaming_links,
            users.avatar_url,
            users.avatar_storage_key,
            users.avatar_content_type,
            users.banner_image_url,
            users.banner_storage_key,
            users.banner_content_type,
            TRUE,
            users.created_at,
            COALESCE(users.updated_at, users.created_at)
        FROM users
        WHERE EXISTS (
            SELECT 1
            FROM tracks
            WHERE tracks.user_id = users.id
        )
           OR users.display_name IS NOT NULL
           OR users.avatar_storage_key IS NOT NULL
           OR users.banner_storage_key IS NOT NULL
           OR users.bio IS NOT NULL
        """
    )

    op.add_column("tracks", sa.Column("artist_id", sa.Integer(), nullable=True))
    op.execute(
        """
        UPDATE tracks
        SET artist_id = artists.id
        FROM artists
        WHERE artists.user_id = tracks.user_id
        """
    )
    op.alter_column("tracks", "artist_id", existing_type=sa.Integer(), nullable=False)
    op.create_foreign_key("fk_tracks_artist_id_artists", "tracks", "artists", ["artist_id"], ["id"], ondelete="RESTRICT")
    op.create_index("ix_tracks_artist_id", "tracks", ["artist_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_tracks_artist_id", table_name="tracks")
    op.drop_constraint("fk_tracks_artist_id_artists", "tracks", type_="foreignkey")
    op.drop_column("tracks", "artist_id")
    op.drop_index("ix_artists_public_created_at", table_name="artists")
    op.drop_index("ix_artists_user_id", table_name="artists")
    op.drop_index("ix_artists_slug", table_name="artists")
    op.drop_index("ix_artists_id", table_name="artists")
    op.drop_table("artists")
