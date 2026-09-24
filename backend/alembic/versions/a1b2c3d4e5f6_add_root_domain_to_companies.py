"""add root_domain to companies

Revision ID: a1b2c3d4e5f6
Revises: z6u7n8i9j0k1
Create Date: 2026-09-24 10:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from app.api.companies import extract_root_domain

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'z6u7n8i9j0k1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'companies',
        sa.Column('root_domain', sa.String(length=255), nullable=True),
    )
    op.create_index(op.f('ix_companies_root_domain'), 'companies', ['root_domain'], unique=False)

    # Backfill root_domain from existing website values
    conn = op.get_bind()
    rows = conn.execute(
        sa.text("SELECT id, website FROM companies WHERE website IS NOT NULL")
    ).fetchall()
    for row in rows:
        cid, website = row[0], row[1]
        domain = extract_root_domain(website)
        if domain:
            conn.execute(
                sa.text("UPDATE companies SET root_domain = :domain WHERE id = :cid"),
                {"domain": domain, "cid": cid},
            )


def downgrade() -> None:
    op.drop_index(op.f('ix_companies_root_domain'), table_name='companies')
    op.drop_column('companies', 'root_domain')
