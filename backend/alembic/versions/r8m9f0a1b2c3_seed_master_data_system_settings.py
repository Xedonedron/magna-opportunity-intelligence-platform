"""seed master data into system_settings

Revision ID: r8m9f0a1b2c3
Revises: q7l8e9f0a2c3
Create Date: 2026-09-10 10:30:00

"""
import json
import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'r8m9f0a1b2c3'
down_revision: Union[str, None] = 'q7l8e9f0a2c3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_PRESALES = [
    "Devi",
    "Bayu",
    "Gerry",
    "Farhan",
    "Atthur",
    "Rian",
    "Syamsul",
]

DEFAULT_INDUSTRIES = [
    "Finance & Banking",
    "Insurance",
    "Manufacturing",
    "Healthcare",
    "Telecommunications",
    "Retail & E-commerce",
    "Government",
    "Technology & SaaS",
    "Oil & Gas",
    "Energy & Utilities",
    "Mining & Metals",
    "Agriculture & Agribusiness",
    "Construction & Real Estate",
    "Transportation & Logistics",
    "Education & EdTech",
    "Media & Entertainment",
    "Hospitality & Tourism",
    "Automotive",
    "Pharmaceuticals & Biotech",
    "Professional Services",
    "Food & Beverage",
    "Defense & Aerospace",
    "Non-Profit / NGO",
]

DEFAULT_DOCUMENT_LABELS = [
    "MoM",
    "Compro",
    "Solution Brief",
    "Assessment List",
    "Technical Proposal",
]

MASTER_SEEDS = [
    {
        "key": "master_data_presales",
        "value": json.dumps(DEFAULT_PRESALES),
        "description": "Predefined Pre-Sales team member names",
    },
    {
        "key": "master_data_industries",
        "value": json.dumps(DEFAULT_INDUSTRIES),
        "description": "Predefined industry sectors",
    },
    {
        "key": "master_data_document_labels",
        "value": json.dumps(DEFAULT_DOCUMENT_LABELS),
        "description": "Predefined opportunity document labels",
    },
]


def upgrade() -> None:
    conn = op.get_bind()
    for item in MASTER_SEEDS:
        conn.execute(
            sa.text("""
                INSERT INTO system_settings (id, key, value, description, updated_at)
                VALUES (:id, :key, :value, :description, NOW())
                ON CONFLICT (key) DO UPDATE SET
                    value = CASE 
                        WHEN system_settings.value IS NULL OR system_settings.value = '["Devi", "Bayu", "Gerry"]'
                        THEN EXCLUDED.value
                        ELSE system_settings.value
                    END,
                    description = EXCLUDED.description,
                    updated_at = NOW()
            """),
            {
                "id": str(uuid.uuid4()),
                "key": item["key"],
                "value": item["value"],
                "description": item["description"],
            }
        )


def downgrade() -> None:
    conn = op.get_bind()
    for item in MASTER_SEEDS:
        conn.execute(
            sa.text("DELETE FROM system_settings WHERE key = :key"),
            {"key": item["key"]}
        )
