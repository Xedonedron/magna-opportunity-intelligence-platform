"""add capabilities to users

Revision ID: d4e5f6a7b8c9
Revises: c8deebc9d7fc
Create Date: 2026-07-31 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c8deebc9d7fc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add capabilities column as nullable first
    op.add_column('users', sa.Column('capabilities', sa.String(length=255), nullable=True))
    
    # 2. Seed default capabilities for existing users based on their roles
    # admin/superadmin: view,create_edit,delete,generate_kyc,user_management
    # manager/lgo: view,create_edit,delete,generate_kyc
    # engineer: view,generate_kyc
    # default/others: view
    op.execute("UPDATE users SET capabilities = 'view,create_edit,delete,generate_kyc,user_management' WHERE role = 'admin' OR role = 'superadmin'")
    op.execute("UPDATE users SET capabilities = 'view,create_edit,delete,generate_kyc' WHERE role = 'manager' OR role = 'lgo'")
    op.execute("UPDATE users SET capabilities = 'view,generate_kyc' WHERE role = 'engineer'")
    op.execute("UPDATE users SET capabilities = 'view' WHERE capabilities IS NULL")
    
    # 3. Alter capabilities column to be non-nullable with server default
    op.alter_column('users', 'capabilities', nullable=False, server_default='view')


def downgrade() -> None:
    op.drop_column('users', 'capabilities')
