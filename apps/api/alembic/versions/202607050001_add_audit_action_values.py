"""add audit action enum values

Revision ID: 202607050001
Revises: 202607010001
Create Date: 2026-07-05
"""

from __future__ import annotations

from alembic import op

revision = "202607050001"
down_revision = "202607010001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'shortlist'")
    op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'request_info'")


def downgrade() -> None:
    pass
