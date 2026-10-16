"""add assigned_engineer_id to opportunities and backfill user references

Revision ID: c3d4e5f6a7b8
Revises: c2d3e4f5a6b7
Create Date: 2026-10-16 16:05:00.000000

"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op


revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'c2d3e4f5a6b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add assigned_engineer_id column to opportunities
    op.add_column(
        'opportunities',
        sa.Column('assigned_engineer_id', sa.UUID(), nullable=True),
    )
    op.create_foreign_key(
        'fk_opportunities_assigned_engineer_id',
        'opportunities',
        'users',
        ['assigned_engineer_id'],
        ['id'],
        ondelete='SET NULL',
    )
    op.create_index(
        op.f('ix_opportunities_assigned_engineer_id'),
        'opportunities',
        ['assigned_engineer_id'],
        unique=False,
    )

    # 2. Backfill assigned_engineer_id from existing assigned_engineer strings
    conn = op.get_bind()
    opps = conn.execute(
        sa.text(
            "SELECT id, assigned_engineer FROM opportunities "
            "WHERE assigned_engineer IS NOT NULL AND TRIM(assigned_engineer) != ''"
        )
    ).fetchall()

    for opp_id, eng_str in opps:
        clean_eng = eng_str.strip()
        if not clean_eng:
            continue
        matched_user = conn.execute(
            sa.text(
                "SELECT id FROM users "
                "WHERE LOWER(full_name) = LOWER(:eng) "
                "OR LOWER(email) = LOWER(:eng) "
                "OR full_name ILIKE :like_eng "
                "OR email ILIKE :prefix_eng "
                "ORDER BY is_active DESC LIMIT 1"
            ),
            {
                "eng": clean_eng,
                "like_eng": f"%{clean_eng}%",
                "prefix_eng": f"{clean_eng}%",
            },
        ).fetchone()
        if matched_user:
            conn.execute(
                sa.text(
                    "UPDATE opportunities SET assigned_engineer_id = :uid WHERE id = :oid"
                ),
                {"uid": matched_user[0], "oid": opp_id},
            )


def downgrade() -> None:
    op.drop_index(op.f('ix_opportunities_assigned_engineer_id'), table_name='opportunities')
    op.drop_constraint('fk_opportunities_assigned_engineer_id', 'opportunities', type_='foreignkey')
    op.drop_column('opportunities', 'assigned_engineer_id')
