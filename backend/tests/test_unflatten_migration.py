"""
backend/tests/test_unflatten_migration.py

Automated tests for the un-flattening migration algorithm and logic
tested against the 34 real database snapshot records.
"""

import sys
import os
import uuid
import pytest
from sqlalchemy.orm import Session

# Add scripts directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "scripts")))

from unflatten_opportunities import (
    normalize_company_name,
    cluster_opportunities,
    run_unflatten_migration,
    OpportunityRecord,
)
from app.models.company import Company
from app.models.opportunity import Opportunity
from app.models.user import User


REAL_34_RECORDS = [
    {"id": "d3b61780-d1e0-45d6-9511-68a63d5e69d6", "company_name": "Advisains"},
    {"id": "1b8ceb79-ee0f-4ac6-9540-0782f5b4c76a", "company_name": "Asuransi Jasindo"},
    {"id": "a9654bfd-365f-4500-b28b-e482c3e52bcd", "company_name": "Bank bjb"},
    {"id": "fde3dca5-0b55-48f3-b2d0-9ce1e8a6f712", "company_name": "Bappeda Kutai Kertanegara"},
    {"id": "876c4e2c-d01a-4e52-9fe3-4fe832d92171", "company_name": "Bintang 7"},
    {"id": "bfe49482-1318-4a12-baee-27849cf4c248", "company_name": "Cardig Aero Services"},
    {"id": "fcb71609-1403-45b4-b4ef-d0b14fc76a80", "company_name": "Dana Pensiun Bank Mandiri"},
    {"id": "5c4af4ab-9d69-4f24-bd71-6582f2b5e550", "company_name": "Era ventura indonesia"},
    {"id": "97b7f9ab-59ee-4ccd-9209-73b4ea603399", "company_name": "Gibox Digital Asia"},
    {"id": "f0a55a78-d295-4028-beb3-e9c8d5699b16", "company_name": "Indoprima Group"},
    {"id": "41a836f8-d915-45b1-b7a6-8935b1780883", "company_name": "JNE"},
    {"id": "08f6d884-c9ae-49ff-bc77-ffb280ba0ea0", "company_name": "Kalbe Farma"},
    {"id": "77061fec-5ce3-45fe-9c4e-a25861f71e8d", "company_name": "Microdrama"},
    {"id": "6959aa68-8d97-4bd9-be44-c215cd6d08b6", "company_name": "Nodeflux"},
    {"id": "b1f530cd-6d5e-41b2-a632-06aea4efe099", "company_name": "Omnicare"},
    {"id": "9ae9b99c-0353-43ab-9bdb-0d86174d68db", "company_name": "PT BRI Life"},
    {"id": "983f350d-046b-4590-9b4f-37dc5d74832e", "company_name": "PT Cahaya Matahari Prima"},
    {"id": "61af6e00-402d-4f3e-bab6-e7835dc853c6", "company_name": "PT Cardig Aero Services"},
    {"id": "dae70398-0859-4f34-8d3a-8635359fbf0d", "company_name": "PT Darma Henwa"},
    {"id": "2f098736-b1ca-49d1-9cd9-b4299148f276", "company_name": "PT Giordano Indonesia"},
    {"id": "bd7a795f-df4f-4c9e-9579-150565c276a1", "company_name": "PT Inovasi Lintas Media"},
    {"id": "888a826a-f4d2-4d46-ba04-36586f82172c", "company_name": "PT Prodia Widyahusada Tbk"},
    {"id": "1fe85034-c554-46d8-97fb-f8ed0186f5ec", "company_name": "PT Prodia Widyahusada Tbk"},
    {"id": "b6c24fa9-2955-4371-a151-c72f01c96e4a", "company_name": "PT Prodia Widyahusada Tbk"},
    {"id": "bd5db437-d3d8-4793-b53c-380c8cec251c", "company_name": "PT SMBC Indonesia"},
    {"id": "c3daedc5-0a14-4e0d-9615-e0ebc2e3d20c", "company_name": "PT SPR Langgak"},
    {"id": "88ee72bb-80c3-4594-b499-ea33b068c39b", "company_name": "PT. Indoteknik Dotcom Gemilang"},
    {"id": "81585f2e-0471-42bd-aa1c-a4638997a915", "company_name": "Penerbit Erlangga"},
    {"id": "392a3e5c-2d92-4635-9fa6-c62ea0cbc04c", "company_name": "SCSKIDN"},
    {"id": "f75cffe3-8c07-4f18-b487-eca25d7e3794", "company_name": "SMC RS Telogorejo"},
    {"id": "47a4bbfe-cb59-444f-9677-8bd7a4e0a5f4", "company_name": "Sampoerna Schools Systems - Custom Dashboard"},
    {"id": "a3841240-6f09-4bb8-a6d8-9532550cb680", "company_name": "Sampoerna Schools Systems - Gemini Enterprise"},
    {"id": "b20ee900-e86c-4c91-a365-884c0ab3d7b7", "company_name": "Semen Baturaja Tbk"},
    {"id": "2b76e96d-24af-4346-873c-d4badc64a3db", "company_name": "Top Group"}
]


def test_normalize_company_name():
    # Delimiter hyphen test
    base, deal, key = normalize_company_name("Sampoerna Schools Systems - Custom Dashboard")
    assert base == "Sampoerna Schools Systems"
    assert deal == "Custom Dashboard"
    assert key == "sampoerna schools systems"

    # PT prefix test
    base, deal, key = normalize_company_name("PT Cardig Aero Services")
    assert base == "PT Cardig Aero Services"
    assert deal is None
    assert key == "cardig aero services"

    # No prefix vs PT prefix
    _, _, key1 = normalize_company_name("Cardig Aero Services")
    _, _, key2 = normalize_company_name("PT Cardig Aero Services")
    assert key1 == key2

    # Tbk suffix test
    base, deal, key = normalize_company_name("PT Prodia Widyahusada Tbk")
    assert base == "PT Prodia Widyahusada Tbk"
    assert key == "prodia widyahusada"

    # Dot in PT. test
    _, _, key_dot = normalize_company_name("PT. Indoteknik Dotcom Gemilang")
    assert key_dot == "indoteknik dotcom gemilang"


def test_clustering_34_real_records():
    records = [
        OpportunityRecord(id=r["id"], company_name=r["company_name"])
        for r in REAL_34_RECORDS
    ]
    clusters = cluster_opportunities(records)

    # 34 records should yield exactly 30 unique companies:
    # - 1 Cardig (merging 2 records)
    # - 1 Sampoerna (merging 2 records)
    # - 1 Prodia (merging 3 records)
    # - 27 single records
    # Total = 30
    assert len(clusters) == 30

    # Verify Cardig cluster has 2 opportunities
    cardig_key = "cardig aero services"
    assert cardig_key in clusters
    assert len(clusters[cardig_key].opportunities) == 2
    cardig_ids = {o.id for o in clusters[cardig_key].opportunities}
    assert "bfe49482-1318-4a12-baee-27849cf4c248" in cardig_ids
    assert "61af6e00-402d-4f3e-bab6-e7835dc853c6" in cardig_ids

    # Verify Sampoerna cluster has 2 opportunities
    sampoerna_key = "sampoerna schools systems"
    assert sampoerna_key in clusters
    assert len(clusters[sampoerna_key].opportunities) == 2
    sampoerna_ids = {o.id for o in clusters[sampoerna_key].opportunities}
    assert "47a4bbfe-cb59-444f-9677-8bd7a4e0a5f4" in sampoerna_ids
    assert "a3841240-6f09-4bb8-a6d8-9532550cb680" in sampoerna_ids

    # Verify Prodia cluster has 3 opportunities
    prodia_key = "prodia widyahusada"
    assert prodia_key in clusters
    assert len(clusters[prodia_key].opportunities) == 3
    prodia_ids = {o.id for o in clusters[prodia_key].opportunities}
    assert "888a826a-f4d2-4d46-ba04-36586f82172c" in prodia_ids
    assert "1fe85034-c554-46d8-97fb-f8ed0186f5ec" in prodia_ids
    assert "b6c24fa9-2955-4371-a151-c72f01c96e4a" in prodia_ids


def test_unflatten_dry_run_and_commit_in_db(db: Session, test_user: User):
    # Seed the 34 opportunities in test database
    for r in REAL_34_RECORDS:
        opp = Opportunity(
            id=uuid.UUID(r["id"]),
            company_name=r["company_name"],
            customer_needs="Needs enterprise solutions and consulting",
            created_by=test_user.id,
            status="New",
        )
        db.add(opp)
    db.commit()

    # Step 1: Run Dry-Run
    dry_result = run_unflatten_migration(db_session=db, dry_run=True)
    assert dry_result["status"] == "dry_run"
    assert dry_result["total_opportunities"] == 34
    assert dry_result["total_companies_created"] == 30
    assert dry_result["multi_opportunity_companies"] == 3

    # Ensure no companies created yet during dry-run
    companies_count_pre = db.query(Company).count()
    assert companies_count_pre == 0

    # Step 2: Run Commit
    commit_result = run_unflatten_migration(db_session=db, dry_run=False)
    assert commit_result["status"] == "committed"
    assert commit_result["total_opportunities"] == 34
    assert commit_result["total_companies_created"] == 30

    # Verify companies created in DB
    companies_count_post = db.query(Company).count()
    assert companies_count_post == 30

    # Verify all 34 opportunities have valid company_id assigned
    opportunities_post = db.query(Opportunity).all()
    assert len(opportunities_post) == 34
    for o in opportunities_post:
        assert o.company_id is not None
        assert o.company is not None

    # Verify Cardig company has 2 opportunities in relationship
    cardig_comp = db.query(Company).filter(Company.normalized_name == "cardig aero services").first()
    assert cardig_comp is not None
    assert len(cardig_comp.opportunities) == 2

    # Verify Sampoerna company has 2 opportunities in relationship and deal titles extracted
    sampoerna_comp = db.query(Company).filter(Company.normalized_name == "sampoerna schools systems").first()
    assert sampoerna_comp is not None
    assert len(sampoerna_comp.opportunities) == 2
    sampoerna_products = {o.product for o in sampoerna_comp.opportunities}
    assert "Custom Dashboard" in sampoerna_products
    assert "Gemini Enterprise" in sampoerna_products

    # Verify Prodia company has 3 opportunities in relationship
    prodia_comp = db.query(Company).filter(Company.normalized_name == "prodia widyahusada").first()
    assert prodia_comp is not None
    assert len(prodia_comp.opportunities) == 3
