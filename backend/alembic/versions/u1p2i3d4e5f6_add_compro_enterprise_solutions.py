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
            "primary_products": json.dumps(item.get("primary_products", []), ensure_ascii=False),
            "all_products": json.dumps(item.get("all_products", []), ensure_ascii=False),
            "target_industries": json.dumps(item.get("target_industries", ["Enterprise General"]), ensure_ascii=False),
            "key_subheadings": json.dumps(item.get("key_subheadings", []), ensure_ascii=False),
            "pain_points": json.dumps(item.get("pain_points", []), ensure_ascii=False),
            "business_impact": (item.get("business_impact") or "").strip(),
            "summary_snippet": (item.get("summary_snippet") or "").strip(),
            "source_url": source_url,
            "is_active": True,
        }

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
                ON CONFLICT (slug) DO UPDATE SET
                    title = EXCLUDED.title,
                    pillar = EXCLUDED.pillar,
                    tier = EXCLUDED.tier,
                    primary_products = EXCLUDED.primary_products,
                    all_products = EXCLUDED.all_products,
                    target_industries = EXCLUDED.target_industries,
                    key_subheadings = EXCLUDED.key_subheadings,
                    pain_points = EXCLUDED.pain_points,
                    business_impact = EXCLUDED.business_impact,
                    summary_snippet = EXCLUDED.summary_snippet,
                    source_url = EXCLUDED.source_url,
                    is_active = EXCLUDED.is_active,
                    updated_at = NOW();
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
