"""add prospecting capability to roles

Revision ID: c2d3e4f5a6b7
Revises: b1c2d3e4f5a6
Create Date: 2026-10-02 08:35:00.000000

"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op


revision: str = 'c2d3e4f5a6b7'
down_revision: Union[str, None] = 'b1c2d3e4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    
    # Query users with roles superadmin, admin, manager, lgo, lead_gen, managerial
    users_table = sa.table(
        'users',
        sa.column('id', sa.UUID()),
        sa.column('role', sa.String()),
        sa.column('capabilities', sa.String()),
    )
    
    target_roles = ('superadmin', 'admin', 'manager', 'lgo', 'lead_gen', 'managerial')
    rows = conn.execute(
        sa.select(users_table.c.id, users_table.c.role, users_table.c.capabilities)
        .where(users_table.c.role.in_(target_roles))
    ).fetchall()

    for row in rows:
        user_id = row[0]
        caps_str = row[2] or ""
        caps = [c.strip() for c in caps_str.split(",") if c.strip()]
        if "prospecting" not in caps:
            caps.append("prospecting")
            new_caps_str = ",".join(caps)
            conn.execute(
                users_table.update()
                .where(users_table.c.id == user_id)
                .values(capabilities=new_caps_str)
            )


def downgrade() -> None:
    conn = op.get_bind()
    users_table = sa.table(
        'users',
        sa.column('id', sa.UUID()),
        sa.column('capabilities', sa.String()),
    )
    rows = conn.execute(
        sa.select(users_table.c.id, users_table.c.capabilities)
        .where(users_table.c.capabilities.isnot(None))
    ).fetchall()

    for row in rows:
        user_id = row[0]
        caps_str = row[1] or ""
        caps = [c.strip() for c in caps_str.split(",") if c.strip() and c.strip() != "prospecting"]
        new_caps_str = ",".join(caps)
        conn.execute(
            users_table.update()
            .where(users_table.c.id == user_id)
            .values(capabilities=new_caps_str)
        )
