"""add link_url to notifications

Revision ID: v2q3j4e5f6g7
Revises: u1p2i3d4e5f6
Create Date: 2026-09-14 10:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'v2q3j4e5f6g7'
down_revision: Union[str, None] = 'u1p2i3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('notifications', sa.Column('link_url', sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column('notifications', 'link_url')
