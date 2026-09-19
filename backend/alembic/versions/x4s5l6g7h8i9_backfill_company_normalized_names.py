"""backfill company normalized_names with recursive normalization

Revision ID: x4s5l6g7h8i9
Revises: w3r4k5f6g7h8
Create Date: 2026-09-19 13:05:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from app.api.companies import compute_normalized_name


# revision identifiers, used by Alembic.
revision: str = 'x4s5l6g7h8i9'
down_revision: Union[str, None] = 'w3r4k5f6g7h8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Recompute normalized_name on all existing company records using recursive normalization
    conn = op.get_bind()
    companies = conn.execute(sa.text("SELECT id, name, normalized_name FROM companies")).fetchall()
    for row in companies:
        cid, name, old_norm = row[0], row[1], row[2]
        if name:
            new_norm = compute_normalized_name(name)
            if new_norm != old_norm:
                conn.execute(
                    sa.text("UPDATE companies SET normalized_name = :new_norm, updated_at = now() WHERE id = :cid"),
                    {"new_norm": new_norm, "cid": cid}
                )


def downgrade() -> None:
    pass
