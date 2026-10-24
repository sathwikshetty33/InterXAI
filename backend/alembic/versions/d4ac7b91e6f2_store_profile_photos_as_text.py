"""Store profile photos as text so uploaded image data can be saved.

Revision ID: d4ac7b91e6f2
Revises: b0a25b0c413f
Create Date: 2026-10-24 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d4ac7b91e6f2"
down_revision: Union[str, Sequence[str], None] = "b0a25b0c413f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "user_profiles",
        "photo",
        existing_type=sa.String(length=255),
        type_=sa.Text(),
        existing_nullable=True,
    )
    op.alter_column(
        "organizations",
        "photo",
        existing_type=sa.String(length=255),
        type_=sa.Text(),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "organizations",
        "photo",
        existing_type=sa.Text(),
        type_=sa.String(length=255),
        existing_nullable=True,
    )
    op.alter_column(
        "user_profiles",
        "photo",
        existing_type=sa.Text(),
        type_=sa.String(length=255),
        existing_nullable=True,
    )
