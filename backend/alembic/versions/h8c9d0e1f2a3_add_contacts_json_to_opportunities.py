"""add contacts json to opportunities

Revision ID: h8c9d0e1f2a3
Revises: f6a7b8c9d0e1
Create Date: 2026-08-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'h8c9d0e1f2a3'
down_revision: Union[str, None] = 'f6a7b8c9d0e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('opportunities', sa.Column('contacts', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('opportunities', 'contacts')