"""Add artist profile fields.

Revision ID: 20260422_000008
Revises: 20260422_000007
Create Date: 2026-04-22 18:20:00
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "20260422_000008"
down_revision = "20260422_000007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("display_name", sa.String(length=120), nullable=True))
    op.add_column("users", sa.Column("location", sa.String(length=120), nullable=True))
    op.add_column("users", sa.Column("profile_genres", postgresql.ARRAY(sa.String()), nullable=True))
    op.add_column("users", sa.Column("social_links", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("users", sa.Column("streaming_links", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("users", sa.Column("banner_image_url", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("avatar_storage_key", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("avatar_content_type", sa.String(length=100), nullable=True))
    op.add_column("users", sa.Column("banner_storage_key", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("banner_content_type", sa.String(length=100), nullable=True))
    op.create_index("ix_users_display_name", "users", ["display_name"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_users_display_name", table_name="users")
    op.drop_column("users", "banner_content_type")
    op.drop_column("users", "banner_storage_key")
    op.drop_column("users", "avatar_content_type")
    op.drop_column("users", "avatar_storage_key")
    op.drop_column("users", "banner_image_url")
    op.drop_column("users", "streaming_links")
    op.drop_column("users", "social_links")
    op.drop_column("users", "profile_genres")
    op.drop_column("users", "location")
    op.drop_column("users", "display_name")
