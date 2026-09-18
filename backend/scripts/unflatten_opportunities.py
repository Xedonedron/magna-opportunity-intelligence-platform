#!/usr/bin/env python3
"""
scripts/unflatten_opportunities.py

Offline data migration script for MOIP:
Restructures flat Opportunities into Company -> Multi-Opportunity Folder Model.
- Normalizes legal prefixes/suffixes (PT, CV, Tbk).
- Parses hyphenated company/deal titles (e.g., "Company - Project").
- Deduplicates companies and links opportunities via foreign key company_id.
- Operates non-destructively: retains opportunity.company_name as fallback.
- Supports --dry-run (default safe mode) and --commit.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional

# Ensure backend directory is in sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CANDIDATES = [
    os.path.abspath(os.path.join(SCRIPT_DIR, "..", "backend")),
    os.path.abspath(os.path.join(SCRIPT_DIR, "..")),
    os.path.abspath(SCRIPT_DIR),
    "/app",
]
for p in CANDIDATES:
    if os.path.isdir(os.path.join(p, "app")):
        if p not in sys.path:
            sys.path.insert(0, p)
        break

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("unflatten")


# --- Legal entity patterns ---
LEGAL_PREFIX_RE = re.compile(r"^(pt\.?|cv\.?|ud\.?|yayasan|koperasi|perum)\s+", re.IGNORECASE)
LEGAL_SUFFIX_RE = re.compile(r"\s+(tbk\.?|\(persero\)|persero|ltd\.?|inc\.?|llc\.?)$", re.IGNORECASE)
PUNCTUATION_RE = re.compile(r"[^\w\s]")


def normalize_company_name(raw_name: str) -> tuple[str, Optional[str], str]:
    """
    Given a raw company string from legacy opportunities:
    Returns (display_name, extracted_deal_title, normalized_key).
    
    Examples:
    - 'Sampoerna Schools Systems - Custom Dashboard' ->
        ('Sampoerna Schools Systems', 'Custom Dashboard', 'sampoerna schools systems')
    - 'PT Cardig Aero Services' ->
        ('PT Cardig Aero Services', None, 'cardig aero services')
    - 'Cardig Aero Services' ->
        ('Cardig Aero Services', None, 'cardig aero services')
    - 'PT Prodia Widyahusada Tbk' ->
        ('PT Prodia Widyahusada Tbk', None, 'prodia widyahusada')
    """
    clean_raw = raw_name.strip()
    extracted_title: Optional[str] = None
    base_name = clean_raw

    # Check for hyphen delimiter separating Company from Project
    if " - " in clean_raw:
        parts = clean_raw.split(" - ", 1)
        base_name = parts[0].strip()
        extracted_title = parts[1].strip()

    # Create canonical normalized key for clustering
    key = base_name.lower()
    # Strip legal prefix
    key = LEGAL_PREFIX_RE.sub("", key).strip()
    # Strip legal suffix
    key = LEGAL_SUFFIX_RE.sub("", key).strip()
    # Remove punctuation & collapse whitespaces
    key = PUNCTUATION_RE.sub(" ", key)
    key = re.sub(r"\s+", " ", key).strip()

    return base_name, extracted_title, key


@dataclass
class OpportunityRecord:
    id: str
    company_name: str
    website: Optional[str] = None
    industry: Optional[str] = None
    product: Optional[str] = None
    customer_needs: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[Any] = None
    assigned_engineer: Optional[str] = None
    potential_revenue: Optional[float] = None
    company_id: Optional[str] = None


@dataclass
class CompanyCluster:
    canonical_key: str
    chosen_name: str
    normalized_name: str
    website: Optional[str] = None
    industry: Optional[str] = None
    business_process: Optional[str] = None
    employee_count: Optional[str] = None
    tech_stack: list[str] = field(default_factory=list)
    opportunities: list[OpportunityRecord] = field(default_factory=list)
    id: str = field(default_factory=lambda: str(uuid.uuid4()))


def cluster_opportunities(records: list[OpportunityRecord]) -> dict[str, CompanyCluster]:
    """
    Clusters flat opportunity records into unique companies.
    """
    clusters: dict[str, CompanyCluster] = {}

    for rec in records:
        base_name, extracted_title, norm_key = normalize_company_name(rec.company_name)
        
        if norm_key not in clusters:
            clusters[norm_key] = CompanyCluster(
                canonical_key=norm_key,
                chosen_name=base_name,
                normalized_name=norm_key,
                website=rec.website,
                industry=rec.industry,
                opportunities=[rec],
            )
        else:
            cluster = clusters[norm_key]
            cluster.opportunities.append(rec)
            
            # Prefer names with formal prefix like 'PT ' or longer official name
            if len(base_name) > len(cluster.chosen_name) or base_name.upper().startswith("PT"):
                if not cluster.chosen_name.upper().startswith("PT") or len(base_name) > len(cluster.chosen_name):
                    cluster.chosen_name = base_name

            # Fill missing website/industry from sibling opportunities
            if not cluster.website and rec.website:
                cluster.website = rec.website
            if not cluster.industry and rec.industry:
                cluster.industry = rec.industry

    return clusters


def run_unflatten_migration(
    db_session=None,
    records_input: Optional[list[dict]] = None,
    dry_run: bool = True,
    output_audit_file: Optional[str] = None,
) -> dict[str, Any]:
    """
    Core migration runner.
    Can run against SQLAlchemy db_session or in-memory dict records.
    """
    records: list[OpportunityRecord] = []

    if records_input is not None:
        for r in records_input:
            records.append(
                OpportunityRecord(
                    id=str(r.get("id", uuid.uuid4())),
                    company_name=r.get("company_name", ""),
                    website=r.get("website"),
                    industry=r.get("industry"),
                    product=r.get("product"),
                    customer_needs=r.get("customer_needs"),
                    status=r.get("status"),
                    created_at=r.get("created_at"),
                    assigned_engineer=r.get("assigned_engineer"),
                    potential_revenue=r.get("potential_revenue"),
                    company_id=r.get("company_id"),
                )
            )
    elif db_session is not None:
        from app.models.opportunity import Opportunity
        db_opps = db_session.query(Opportunity).all()
        for o in db_opps:
            records.append(
                OpportunityRecord(
                    id=str(o.id),
                    company_name=o.company_name,
                    website=o.website,
                    industry=o.industry,
                    product=o.product,
                    customer_needs=o.customer_needs,
                    status=o.status,
                    created_at=o.created_at,
                    assigned_engineer=o.assigned_engineer,
                    potential_revenue=float(o.potential_revenue) if o.potential_revenue else None,
                    company_id=str(o.company_id) if o.company_id else None,
                )
            )
    else:
        raise ValueError("Either db_session or records_input must be provided.")

    logger.info("Found %d opportunity records to process.", len(records))

    clusters = cluster_opportunities(records)
    logger.info("Identified %d unique Company clusters.", len(clusters))

    audit_summary: list[dict[str, Any]] = []

    for norm_key, cluster in sorted(clusters.items()):
        opp_list = []
        for opp in cluster.opportunities:
            base_name, extracted_title, _ = normalize_company_name(opp.company_name)
            opp_list.append({
                "opportunity_id": opp.id,
                "original_company_name": opp.company_name,
                "extracted_deal_title": extracted_title,
                "product": opp.product,
                "status": opp.status,
            })
        
        audit_summary.append({
            "company_id": cluster.id,
            "company_name": cluster.chosen_name,
            "normalized_name": cluster.normalized_name,
            "industry": cluster.industry,
            "website": cluster.website,
            "opportunities_count": len(cluster.opportunities),
            "opportunities": opp_list,
        })

    # Print human-readable summary
    logger.info("==================== UNFLATTENING CLUSTER PREVIEW ====================")
    for entry in audit_summary:
        opp_count = entry["opportunities_count"]
        flag = " [MULTI-OPPORTUNITY]" if opp_count > 1 else ""
        logger.info(
            "Company: %-32s | Opptys: %d%s | Website: %s",
            entry["company_name"][:32],
            opp_count,
            flag,
            entry["website"] or "-",
        )
        if opp_count > 1:
            for o in entry["opportunities"]:
                logger.info(
                    "   ↳ Deal: %-30s | Product: %-15s | ID: %s",
                    (o["extracted_deal_title"] or o["original_company_name"])[:30],
                    (o["product"] or "-")[:15],
                    o["opportunity_id"][:8],
                )
    logger.info("======================================================================")

    if dry_run:
        logger.info("DRY-RUN MODE ACTIVE: No database changes were committed.")
    else:
        logger.info("COMMIT MODE ACTIVE: Writing changes to database...")
        if db_session is not None:
            from app.models.company import Company
            from app.models.opportunity import Opportunity

            for entry in audit_summary:
                comp_uuid = uuid.UUID(entry["company_id"])
                
                # Check if company with normalized_name already exists in DB
                existing_comp = db_session.query(Company).filter(
                    Company.normalized_name == entry["normalized_name"]
                ).first()

                if not existing_comp:
                    existing_comp = Company(
                        id=comp_uuid,
                        name=entry["company_name"],
                        normalized_name=entry["normalized_name"],
                        website=entry["website"],
                        industry=entry["industry"],
                        business_process=None,
                        employee_count=None,
                        tech_stack=[],
                    )
                    db_session.add(existing_comp)
                    db_session.flush()

                # Update child opportunities
                for o_info in entry["opportunities"]:
                    opp_uuid = uuid.UUID(o_info["opportunity_id"])
                    opp_model = db_session.query(Opportunity).filter(Opportunity.id == opp_uuid).first()
                    if opp_model:
                        opp_model.company_id = existing_comp.id
                        # If deal title was extracted, sanitize company_name and set product if empty
                        if o_info["extracted_deal_title"]:
                            opp_model.company_name = entry["company_name"]
                            if not opp_model.product:
                                opp_model.product = o_info["extracted_deal_title"]
            
            db_session.commit()
            logger.info("Successfully committed un-flattening changes to database.")

    result = {
        "status": "dry_run" if dry_run else "committed",
        "total_opportunities": len(records),
        "total_companies_created": len(clusters),
        "multi_opportunity_companies": sum(1 for c in clusters.values() if len(c.opportunities) > 1),
        "clusters": audit_summary,
    }

    if output_audit_file:
        with open(output_audit_file, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, default=str)
        logger.info("Audit report saved to: %s", output_audit_file)

    return result


def main():
    parser = argparse.ArgumentParser(
        description="Offline data migration: Unflatten opportunities into Company -> Multi-Opportunity"
    )
    parser.add_argument(
        "--commit",
        action="store_true",
        default=False,
        help="Commit changes to database (default is --dry-run)",
    )
    parser.add_argument(
        "--input-json",
        type=str,
        default=None,
        help="Optional path to JSON dump file of opportunities for offline verification",
    )
    parser.add_argument(
        "--output-audit",
        type=str,
        default="unflatten_audit_report.json",
        help="Path to write JSON audit report (default: unflatten_audit_report.json)",
    )
    args = parser.parse_args()

    records_input = None
    if args.input_json:
        logger.info("Loading opportunities from input JSON: %s", args.input_json)
        with open(args.input_json, "r", encoding="utf-8") as f:
            records_input = json.load(f)

    if records_input is not None:
        run_unflatten_migration(
            records_input=records_input,
            dry_run=not args.commit,
            output_audit_file=args.output_audit,
        )
    else:
        # Import backend app database
        sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
        from app.core.database import SessionLocal
        
        db = SessionLocal()
        try:
            run_unflatten_migration(
                db_session=db,
                dry_run=not args.commit,
                output_audit_file=args.output_audit,
            )
        finally:
            db.close()


if __name__ == "__main__":
    main()
