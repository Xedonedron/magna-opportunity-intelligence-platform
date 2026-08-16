"""create opportunity_personas table

Revision ID: k1f2a3b4c5d6
Revises: j0e1f2a3b4c5
Create Date: 2026-08-16 23:14:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'k1f2a3b4c5d6'
down_revision: Union[str, None] = 'j0e1f2a3b4c5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'opportunity_personas',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('opportunity_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('seniority', sa.String(length=50), nullable=False),
        sa.Column('department', sa.String(length=50), nullable=False),
        sa.Column('focus_areas', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('questions', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('value_props', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('objection_handling', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['opportunity_id'], ['opportunities.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('opportunity_id', 'seniority', 'department', name='uq_opp_seniority_department')
    )
    op.create_index(op.f('ix_opportunity_personas_opportunity_id'), 'opportunity_personas', ['opportunity_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_opportunity_personas_opportunity_id'), table_name='opportunity_personas')
    op.drop_table('opportunity_personas')