"""refactor presales assignment to plain text

Revision ID: i9d0e1f2a3b4
Revises: h8c9d0e1f2a3
Create Date: 2026-08-05 09:12:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'i9d0e1f2a3b4'
down_revision: Union[str, None] = 'h8c9d0e1f2a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Drop the foreign key constraint
    op.drop_constraint('opportunities_assigned_engineer_id_fkey', 'opportunities', type_='foreignkey')
    # 2. Drop the old UUID column
    op.drop_column('opportunities', 'assigned_engineer_id')
    # 3. Add the new String column
    op.add_column('opportunities', sa.Column('assigned_engineer', sa.String(length=255), nullable=True))


def downgrade() -> None:
    # 1. Drop the new String column
    op.drop_column('opportunities', 'assigned_engineer')
    # 2. Add the old UUID column
    op.add_column('opportunities', sa.Column('assigned_engineer_id', sa.UUID(), nullable=True))
    # 3. Re-create the foreign key constraint
    op.create_foreign_key(
        'opportunities_assigned_engineer_id_fkey',
        'opportunities',
        'users',
        ['assigned_engineer_id'],
        ['id']
    )
