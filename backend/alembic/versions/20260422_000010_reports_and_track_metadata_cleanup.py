"""Activate track reports and remove BPM/key metadata.

Revision ID: 20260422_000010
Revises: 20260422_000009
Create Date: 2026-04-22 22:40:00
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "20260422_000010"
down_revision = "20260422_000009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("UPDATE reports SET status = 'open' WHERE status IS NULL")
    op.alter_column("reports", "status", existing_type=sa.String(length=50), nullable=False, server_default="open")
    op.create_index("ix_reports_track_id", "reports", ["track_id"], unique=False)
    op.create_index("ix_reports_reporter_id", "reports", ["reporter_id"], unique=False)
    op.create_index("ix_reports_track_status", "reports", ["track_id", "status"], unique=False)
    op.create_index("ix_reports_created_at", "reports", ["created_at"], unique=False)
    op.create_index(
        "uq_reports_open_reporter_track",
        "reports",
        ["reporter_id", "track_id"],
        unique=True,
        postgresql_where=sa.text("status = 'open' AND track_id IS NOT NULL"),
    )

    op.drop_column("tracks", "bpm")
    op.drop_column("tracks", "key_signature")


def downgrade() -> None:
    op.add_column("tracks", sa.Column("key_signature", sa.String(length=20), nullable=True))
    op.add_column("tracks", sa.Column("bpm", sa.Integer(), nullable=True))

    op.drop_index("uq_reports_open_reporter_track", table_name="reports")
    op.drop_index("ix_reports_created_at", table_name="reports")
    op.drop_index("ix_reports_track_status", table_name="reports")
    op.drop_index("ix_reports_reporter_id", table_name="reports")
    op.drop_index("ix_reports_track_id", table_name="reports")
    op.alter_column("reports", "status", existing_type=sa.String(length=50), nullable=True, server_default=None)
