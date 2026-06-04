"""Widen custom_interviews.experience from VARCHAR(10) to VARCHAR(50).

The 10-char cap rejected natural experience labels like "Entry-level" or
"Mid-Senior", surfacing as an unhandled 500 on interview creation.

Revision ID: b2f9a7c4d1e8
Revises: 4e18d0ef5443
Create Date: 2026-06-02 18:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2f9a7c4d1e8'
down_revision: Union[str, Sequence[str], None] = '4e18d0ef5443'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column(
        'custom_interviews',
        'experience',
        existing_type=sa.String(length=10),
        type_=sa.String(length=50),
        existing_nullable=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column(
        'custom_interviews',
        'experience',
        existing_type=sa.String(length=50),
        type_=sa.String(length=10),
        existing_nullable=False,
    )
