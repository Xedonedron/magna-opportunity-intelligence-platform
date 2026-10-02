"""link opportunities to company contacts and backfill stakeholders

Revision ID: b1c2d3e4f5a6
Revises: a1b2c3d4e5f6
Create Date: 2026-10-02 08:00:00.000000

"""
from typing import Sequence, Union
import uuid
from datetime import datetime, timezone
import sqlalchemy as sa
from alembic import op


revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add primary_contact_id column to opportunities
    op.add_column('opportunities', sa.Column('primary_contact_id', sa.UUID(), nullable=True))
    op.create_foreign_key(
        'fk_opportunities_primary_contact_id',
        'opportunities',
        'company_contacts',
        ['primary_contact_id'],
        ['id'],
        ondelete='SET NULL'
    )
    op.create_index(
        op.f('ix_opportunities_primary_contact_id'),
        'opportunities',
        ['primary_contact_id'],
        unique=False
    )

    # 2. Data backfill: populate company_contacts for existing opportunities with contact_name
    conn = op.get_bind()

    opps = conn.execute(
        sa.text(
            "SELECT id, company_id, contact_name, email, phone FROM opportunities "
            "WHERE company_id IS NOT NULL AND contact_name IS NOT NULL AND TRIM(contact_name) != ''"
        )
    ).fetchall()

    for opp in opps:
        opp_id = opp[0]
        company_id = opp[1]
        contact_name = opp[2].strip()
        email = opp[3].strip() if opp[3] else None
        phone = opp[4].strip() if opp[4] else None

        existing_contact = conn.execute(
            sa.text(
                "SELECT id FROM company_contacts "
                "WHERE company_id = :comp_id AND LOWER(name) = LOWER(:name) LIMIT 1"
            ),
            {"comp_id": company_id, "name": contact_name}
        ).fetchone()

        if existing_contact:
            contact_id = existing_contact[0]
        else:
            contact_count = conn.execute(
                sa.text("SELECT COUNT(*) FROM company_contacts WHERE company_id = :comp_id"),
                {"comp_id": company_id}
            ).scalar() or 0

            contact_id = uuid.uuid4()
            now = datetime.now(timezone.utc)
            conn.execute(
                sa.text(
                    "INSERT INTO company_contacts (id, company_id, name, email, phone, is_primary, created_at, updated_at) "
                    "VALUES (:id, :comp_id, :name, :email, :phone, :is_primary, :created_at, :updated_at)"
                ),
                {
                    "id": contact_id,
                    "comp_id": company_id,
                    "name": contact_name,
                    "email": email,
                    "phone": phone,
                    "is_primary": (contact_count == 0),
                    "created_at": now,
                    "updated_at": now,
                }
            )

        conn.execute(
            sa.text("UPDATE opportunities SET primary_contact_id = :contact_id WHERE id = :opp_id"),
            {"contact_id": contact_id, "opp_id": opp_id}
        )


def downgrade() -> None:
    op.drop_index(op.f('ix_opportunities_primary_contact_id'), table_name='opportunities')
    op.drop_constraint('fk_opportunities_primary_contact_id', 'opportunities', type_='foreignkey')
    op.drop_column('opportunities', 'primary_contact_id')
