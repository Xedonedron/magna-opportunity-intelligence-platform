"""sync semantic solution pillar reclassifications and add ETL pipeline card

Revision ID: t0o1h2c3d4e5
Revises: s9n0g1b2c3d4
Create Date: 2026-09-12 12:00:00

"""
import json
import os
import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 't0o1h2c3d4e5'
down_revision: Union[str, None] = 's9n0g1b2c3d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    curated_path = os.path.join(
        os.path.dirname(__file__), "..", "..", "app", "data", "curated_solutions.json"
    )
    if not os.path.exists(curated_path):
        return

    with open(curated_path, "r", encoding="utf-8") as f:
        official_solutions = json.load(f)

    for item in official_solutions:
        slug = item.get("slug") or item.get("id")
        if not slug:
            continue

        source_url = item.get("source_url") or ""

        res = bind.execute(
            sa.text("SELECT id FROM master_solutions WHERE slug = :slug"),
            {"slug": slug}
        ).fetchone()

        payload = {
            "title": item["title"].strip(),
            "slug": item.get("slug") or item.get("id"),
            "pillar": item["pillar"].strip(),
            "tier": item.get("tier", 1),
            "primary_products": json.dumps(item.get("primary_products", [])),
            "all_products": json.dumps(item.get("all_products", [])),
            "target_industries": json.dumps(item.get("target_industries", ["Enterprise General"])),
            "key_subheadings": json.dumps(item.get("key_subheadings", [])),
            "pain_points": json.dumps(item.get("pain_points", [])),
            "business_impact": item.get("business_impact", ""),
            "summary_snippet": item.get("summary_snippet", ""),
            "source_url": source_url,
            "is_active": True,
        }

        if res:
            payload["rec_id"] = res[0]
            bind.execute(
                sa.text("""
                    UPDATE master_solutions
                    SET title = :title, slug = :slug, pillar = :pillar, tier = :tier,
                        primary_products = CAST(:primary_products AS jsonb),
                        all_products = CAST(:all_products AS jsonb),
                        target_industries = CAST(:target_industries AS jsonb),
                        key_subheadings = CAST(:key_subheadings AS jsonb),
                        pain_points = CAST(:pain_points AS jsonb),
                        business_impact = :business_impact,
                        summary_snippet = :summary_snippet,
                        is_active = :is_active, updated_at = NOW()
                    WHERE id = :rec_id
                """),
                payload
            )
        else:
            payload["new_id"] = str(uuid.uuid4())
            bind.execute(
                sa.text("""
                    INSERT INTO master_solutions (
                        id, slug, title, pillar, tier, primary_products,
                        all_products, target_industries, key_subheadings,
                        pain_points, business_impact, summary_snippet,
                        source_url, is_active, created_at, updated_at
                    ) VALUES (
                        CAST(:new_id AS uuid), :slug, :title, :pillar, :tier,
                        CAST(:primary_products AS jsonb),
                        CAST(:all_products AS jsonb),
                        CAST(:target_industries AS jsonb),
                        CAST(:key_subheadings AS jsonb),
                        CAST(:pain_points AS jsonb),
                        :business_impact, :summary_snippet,
                        :source_url, :is_active, NOW(), NOW()
                    )
                """),
                payload
            )


def downgrade() -> None:
    # Reclassification is data-only; no structural rollback needed.
    pass
