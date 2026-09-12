"""add compro enterprise solutions (Planet Ban, MALIKA, Banking ETL, Maps, Healthcare LAN)

Revision ID: u1p2i3d4e5f6
Revises: t0o1h2c3d4e5
Create Date: 2026-09-12 18:00:00

"""
import json
import os
import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'u1p2i3d4e5f6'
down_revision: Union[str, None] = 't0o1h2c3d4e5'
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

        payload = {
            "new_id": str(uuid.uuid4()),
            "title": item["title"].strip(),
            "slug": slug,
            "pillar": item["pillar"].strip(),
            "tier": item.get("tier", 1),
            "status": item.get("status", "APPROVED"),
            "primary_products": json.dumps(item.get("primary_products", []), ensure_ascii=False),
            "all_products": json.dumps(item.get("all_products", []), ensure_ascii=False),
            "target_industries": json.dumps(item.get("target_industries", []), ensure_ascii=False),
            "key_subheadings": json.dumps(item.get("key_subheadings", []), ensure_ascii=False),
            "pain_points": json.dumps(item.get("pain_points", []), ensure_ascii=False),
            "business_impact": (item.get("business_impact") or "").strip(),
            "summary_snippet": (item.get("summary_snippet") or "").strip(),
            "source_url": source_url,
        }

        existing = bind.execute(
            sa.text("SELECT id FROM master_solutions WHERE slug = :slug"),
            {"slug": slug}
        ).fetchone()

        if existing:
            bind.execute(
                sa.text("""
                    UPDATE master_solutions SET
                        title = :title, pillar = :pillar, tier = :tier, status = :status,
                        primary_products = :primary_products, all_products = :all_products,
                        target_industries = :target_industries, key_subheadings = :key_subheadings,
                        pain_points = :pain_points, business_impact = :business_impact,
                        summary_snippet = :summary_snippet, source_url = :source_url,
                        is_active = true
                    WHERE slug = :slug
                """),
                payload
            )
        else:
            bind.execute(
                sa.text("""
                    INSERT INTO master_solutions
                        (id, title, slug, pillar, tier, status,
                         primary_products, all_products, target_industries,
                         key_subheadings, pain_points, business_impact,
                         summary_snippet, source_url, is_active)
                    VALUES
                        (:new_id, :title, :slug, :pillar, :tier, :status,
                         :primary_products, :all_products, :target_industries,
                         :key_subheadings, :pain_points, :business_impact,
                         :summary_snippet, :source_url, true)
                """),
                payload
            )


def downgrade() -> None:
    bind = op.get_bind()
    slugs = [
        'real-time-store-cdc-retail-inventory-pipeline',
        'enterprise-ai-procurement-intelligence-malika',
        'mission-critical-etl-pipeline-monitoring-managed-services',
        'google-maps-platform-fleet-route-location-intelligence',
        'enterprise-healthcare-wired-wireless-lan-infrastructure',
    ]
    for slug in slugs:
        bind.execute(
            sa.text("DELETE FROM master_solutions WHERE slug = :slug"),
            {"slug": slug}
        )
