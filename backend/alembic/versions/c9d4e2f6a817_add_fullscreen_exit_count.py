"""Add fullscreen exit tracking to interview sessions.

Revision ID: c9d4e2f6a817
Revises: d4ac7b91e6f2
Create Date: 2026-10-24 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c9d4e2f6a817"
down_revision: str | Sequence[str] | None = "d4ac7b91e6f2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "interview_sessions",
        sa.Column("fullscreen_exit_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.alter_column("interview_sessions", "fullscreen_exit_count", server_default=None)


def downgrade() -> None:
    op.drop_column("interview_sessions", "fullscreen_exit_count")
