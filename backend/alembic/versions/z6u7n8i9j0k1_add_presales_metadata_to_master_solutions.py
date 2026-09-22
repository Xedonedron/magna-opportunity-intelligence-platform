"""add presales metadata to master_solutions

Revision ID: z6u7n8i9j0k1
Revises: y5t6m7h8i9j0
Create Date: 2026-09-22 22:15:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'z6u7n8i9j0k1'
down_revision: Union[str, None] = 'y5t6m7h8i9j0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'master_solutions',
        sa.Column('solution_domain', sa.String(length=100), server_default='general_enterprise_it', nullable=True)
    )
    op.add_column(
        'master_solutions',
        sa.Column('regulatory_compliance', postgresql.JSONB(astext_type=sa.Text()), server_default='["none"]', nullable=True)
    )
    op.add_column(
        'master_solutions',
        sa.Column('target_environment', sa.String(length=50), server_default='unspecified', nullable=True)
    )
    op.add_column(
        'master_solutions',
        sa.Column('probing_questions', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=True)
    )
    op.add_column(
        'master_solutions',
        sa.Column('battlecard_ammo', postgresql.JSONB(astext_type=sa.Text()), server_default='{}', nullable=True)
    )


def downgrade() -> None:
    op.drop_column('master_solutions', 'battlecard_ammo')
    op.drop_column('master_solutions', 'probing_questions')
    op.drop_column('master_solutions', 'target_environment')
    op.drop_column('master_solutions', 'regulatory_compliance')
    op.drop_column('master_solutions', 'solution_domain')
