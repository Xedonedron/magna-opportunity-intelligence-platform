"""add financial and agenda fields to opportunities

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-08-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'f6a7b8c9d0e1'
down_revision: Union[str, None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('opportunities', sa.Column('potential_revenue', sa.Numeric(precision=15, scale=2), nullable=True))
    op.add_column('opportunities', sa.Column('estimated_agenda_date', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('opportunities', 'estimated_agenda_date')
    op.drop_column('opportunities', 'potential_revenue')
