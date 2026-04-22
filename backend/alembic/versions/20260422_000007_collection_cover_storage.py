"""Add collection cover storage metadata.

Revision ID: 20260422_000007
Revises: 20260422_000006
Create Date: 2026-04-22 16:40:00
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "20260422_000007"
down_revision = "20260422_000006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("playlists", sa.Column("cover_storage_key", sa.Text(), nullable=True))
    op.add_column("playlists", sa.Column("cover_content_type", sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column("playlists", "cover_content_type")
    op.drop_column("playlists", "cover_storage_key")
