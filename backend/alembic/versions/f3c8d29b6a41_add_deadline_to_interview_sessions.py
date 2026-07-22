"""Add deadline to interview_sessions.

Revision ID: f3c8d29b6a41
Revises: e7a2c5d18f4b
Create Date: 2026-07-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3c8d29b6a41'
down_revision: Union[str, Sequence[str], None] = 'e7a2c5d18f4b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('interview_sessions', sa.Column('deadline', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('interview_sessions', 'deadline')
