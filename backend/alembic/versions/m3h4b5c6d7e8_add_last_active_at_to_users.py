"""add last_active_at to users

Revision ID: m3h4b5c6d7e8
Revises: l2g3a4b5c6d7
Create Date: 2026-09-09 14:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'm3h4b5c6d7e8'
down_revision: Union[str, None] = 'l2g3a4b5c6d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('last_active_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_users_last_active_at', 'users', ['last_active_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_users_last_active_at', table_name='users')
    op.drop_column('users', 'last_active_at')
