"""add title and focus_notes to kyc_reports

Revision ID: p6k7e8f9a0b1
Revises: o5j6d7e8f9a0
Create Date: 2026-09-09 22:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'p6k7e8f9a0b1'
down_revision: Union[str, None] = 'o5j6d7e8f9a0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('kyc_reports', sa.Column('title', sa.String(length=255), nullable=True))
    op.add_column('kyc_reports', sa.Column('focus_notes', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('kyc_reports', 'focus_notes')
    op.drop_column('kyc_reports', 'title')
