"""Add proctoring violation count and violation images

Revision ID: b0a25b0c413f
Revises: a91d4e77c8b2
Create Date: 2026-07-23 19:09:33.579646

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b0a25b0c413f'
down_revision: Union[str, Sequence[str], None] = 'a91d4e77c8b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # NOT NULL on an existing table: backfill via a temporary server default,
    # then drop it so the column matches the model (Python-side default=0).
    op.add_column(
        'interview_sessions',
        sa.Column('violation_count', sa.Integer(), nullable=False, server_default='0'),
    )
    op.alter_column('interview_sessions', 'violation_count', server_default=None)

    op.create_table(
        'violation_images',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('session_id', sa.Integer(), nullable=False),
        sa.Column('image_url', sa.Text(), nullable=False),
        sa.Column('violation_type', sa.String(length=50), nullable=False),
        sa.Column(
            'created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False
        ),
        sa.Column(
            'updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False
        ),
        sa.ForeignKeyConstraint(['session_id'], ['interview_sessions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('violation_images')
    op.drop_column('interview_sessions', 'violation_count')
