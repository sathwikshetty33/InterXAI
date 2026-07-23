"""Add ai_shortlist_recommendation to applications.

Revision ID: a91d4e77c8b2
Revises: f3c8d29b6a41
Create Date: 2026-07-22 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a91d4e77c8b2'
down_revision: Union[str, Sequence[str], None] = 'f3c8d29b6a41'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'applications',
        sa.Column('ai_shortlist_recommendation', sa.Boolean(), nullable=True),
    )
    # Backfill: for already-screened applications the current decision is the
    # best available record of what the AI said (it seeded the field, and any
    # org override is indistinguishable now). Only rows that were actually
    # screened — score > 0 or feedback present — get a value; the rest stay
    # NULL, meaning "never screened".
    op.execute(
        """
        UPDATE applications
        SET ai_shortlist_recommendation = shortlisting_decision
        WHERE score > 0 OR feedback IS NOT NULL
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('applications', 'ai_shortlist_recommendation')
