"""create master_solutions table and seed initial curated solutions

Revision ID: o5j6d7e8f9a0
Revises: n4i5c6d7e8f9
Create Date: 2026-09-09 20:30:00

"""
import json
import os
import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'o5j6d7e8f9a0'
down_revision: Union[str, None] = 'n4i5c6d7e8f9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if 'master_solutions' not in tables:
        master_solutions_table = op.create_table(
            'master_solutions',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
            sa.Column('slug', sa.String(length=255), unique=True, nullable=True),
            sa.Column('title', sa.String(length=255), nullable=False),
            sa.Column('pillar', sa.String(length=100), nullable=False),
            sa.Column('tier', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('primary_products', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
            sa.Column('all_products', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='[]'),
            sa.Column('target_industries', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='["Enterprise General"]'),
            sa.Column('key_subheadings', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='[]'),
            sa.Column('pain_points', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='[]'),
            sa.Column('business_impact', sa.Text(), nullable=True),
            sa.Column('summary_snippet', sa.Text(), nullable=True),
            sa.Column('source_url', sa.String(length=500), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

        op.create_index('ix_master_solutions_title', 'master_solutions', ['title'], unique=False)
        op.create_index('ix_master_solutions_slug', 'master_solutions', ['slug'], unique=True)
        op.create_index('ix_master_solutions_pillar', 'master_solutions', ['pillar'], unique=False)
        op.create_index('ix_master_solutions_is_active', 'master_solutions', ['is_active'], unique=False)

        # Seed initial solutions from curated_solutions.json if present
        curated_file = os.path.join(os.path.dirname(__file__), "..", "..", "app", "data", "curated_solutions.json")
        if os.path.exists(curated_file):
            try:
                with open(curated_file, "r", encoding="utf-8") as f:
                    solutions = json.load(f)

                records = []
                for s in solutions:
                    records.append({
                        "id": uuid.uuid4(),
                        "slug": s.get("id"),
                        "title": s.get("title", "Untitled Solution"),
                        "pillar": s.get("pillar", "Cloud Infrastructure & Modernization"),
                        "tier": s.get("tier", 1),
                        "primary_products": s.get("primary_products", []),
                        "all_products": s.get("all_products", []),
                        "target_industries": s.get("target_industries", ["Enterprise General"]),
                        "key_subheadings": s.get("key_subheadings", []),
                        "pain_points": s.get("pain_points", []),
                        "business_impact": s.get("business_impact", ""),
                        "summary_snippet": s.get("summary_snippet", ""),
                        "source_url": s.get("source_url", ""),
                        "is_active": True,
                    })

                if records:
                    op.bulk_insert(master_solutions_table, records)
            except Exception as e:
                print(f"[Alembic] Seed warning: could not seed master_solutions: {e}")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if 'master_solutions' in tables:
        op.drop_index('ix_master_solutions_is_active', table_name='master_solutions')
        op.drop_index('ix_master_solutions_pillar', table_name='master_solutions')
        op.drop_index('ix_master_solutions_slug', table_name='master_solutions')
        op.drop_index('ix_master_solutions_title', table_name='master_solutions')
        op.drop_table('master_solutions')
