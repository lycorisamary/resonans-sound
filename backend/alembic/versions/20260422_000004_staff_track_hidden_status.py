"""Add hidden track status for staff visibility controls.

Revision ID: 20260422_000004
Revises: 20260421_000003
Create Date: 2026-04-22 10:00:00
"""
from __future__ import annotations

from alembic import op


revision = "20260422_000004"
down_revision = "20260421_000003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE track_status ADD VALUE IF NOT EXISTS 'hidden'")


def downgrade() -> None:
    op.execute("UPDATE tracks SET status = 'rejected', is_public = false WHERE status = 'hidden'")
    op.execute("ALTER TABLE tracks ALTER COLUMN status DROP DEFAULT")
    op.execute("ALTER TABLE tracks ALTER COLUMN status TYPE text USING status::text")
    op.execute("DROP TYPE track_status")
    op.execute("CREATE TYPE track_status AS ENUM ('pending', 'processing', 'approved', 'rejected', 'deleted')")
    op.execute(
        "ALTER TABLE tracks ALTER COLUMN status TYPE track_status "
        "USING status::track_status"
    )
    op.execute("ALTER TABLE tracks ALTER COLUMN status SET DEFAULT 'pending'")
