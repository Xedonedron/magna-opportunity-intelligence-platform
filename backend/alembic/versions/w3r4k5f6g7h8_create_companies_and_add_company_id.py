"""create companies table and add company_id to opportunities

Revision ID: w3r4k5f6g7h8
Revises: v2q3j4e5f6g7
Create Date: 2026-09-18 03:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'w3r4k5f6g7h8'
down_revision: Union[str, None] = 'v2q3j4e5f6g7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create companies table
    op.create_table(
        'companies',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('normalized_name', sa.String(length=255), nullable=False),
        sa.Column('website', sa.String(length=500), nullable=True),
        sa.Column('industry', sa.String(length=255), nullable=True),
        sa.Column('business_process', sa.Text(), nullable=True),
        sa.Column('employee_count', sa.String(length=100), nullable=True),
        sa.Column('tech_stack', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_companies_normalized_name', 'companies', ['normalized_name'], unique=False)

    # 2. Add additive nullable company_id column and foreign key to opportunities
    op.add_column('opportunities', sa.Column('company_id', sa.UUID(), nullable=True))
    op.create_index(op.f('ix_opportunities_company_id'), 'opportunities', ['company_id'], unique=False)
    op.create_foreign_key(
        'fk_opportunities_company_id_companies',
        'opportunities',
        'companies',
        ['company_id'],
        ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    op.drop_constraint('fk_opportunities_company_id_companies', 'opportunities', type_='foreignkey')
    op.drop_index(op.f('ix_opportunities_company_id'), table_name='opportunities')
    op.drop_column('opportunities', 'company_id')
    op.drop_index('ix_companies_normalized_name', table_name='companies')
    op.drop_table('companies')
