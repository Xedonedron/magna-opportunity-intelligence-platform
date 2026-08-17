"""add competitor_analysis to kyc_reports

Revision ID: l2g3a4b5c6d7
Revises: k1f2a3b4c5d6
Create Date: 2026-08-17 12:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'l2g3a4b5c6d7'
down_revision: Union[str, None] = 'k1f2a3b4c5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('kyc_reports', sa.Column('competitor_analysis', postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    op.drop_column('kyc_reports', 'competitor_analysis')
