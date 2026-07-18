"""Add submission bookkeeping to dsa_interactions.

Revision ID: e7a2c5d18f4b
Revises: b2f9a7c4d1e8
Create Date: 2026-07-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e7a2c5d18f4b'
down_revision: Union[str, Sequence[str], None] = 'b2f9a7c4d1e8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'dsa_interactions',
        sa.Column('attempts', sa.Integer(), server_default='0', nullable=False),
    )
    op.add_column('dsa_interactions', sa.Column('passed_cases', sa.Integer(), nullable=True))
    op.add_column('dsa_interactions', sa.Column('total_cases', sa.Integer(), nullable=True))
    op.add_column('dsa_interactions', sa.Column('last_submitted_at', sa.DateTime(), nullable=True))
    op.add_column('interview_sessions', sa.Column('dsa_assigned_at', sa.DateTime(), nullable=True))
    op.create_unique_constraint(
        'uq_dsa_interactions_session_topic', 'dsa_interactions', ['session_id', 'topic_id']
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('uq_dsa_interactions_session_topic', 'dsa_interactions', type_='unique')
    op.drop_column('interview_sessions', 'dsa_assigned_at')
    op.drop_column('dsa_interactions', 'last_submitted_at')
    op.drop_column('dsa_interactions', 'total_cases')
    op.drop_column('dsa_interactions', 'passed_cases')
    op.drop_column('dsa_interactions', 'attempts')
