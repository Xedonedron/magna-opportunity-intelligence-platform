"""
backend/tests/test_companies.py

Unit tests for Company endpoints and Company -> Multi-Opportunity relations.
"""

import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.opportunity import Opportunity
from app.models.user import User


def test_list_companies_unauthenticated(client: TestClient):
    response = client.get("/api/companies")
    assert response.status_code == 401


def test_create_company_success(client: TestClient, auth_headers: dict[str, str], db: Session):
    payload = {
        "name": "PT Telkom Indonesia Tbk",
        "website": "telkom.co.id",
        "industry": "Telecommunications",
        "business_process": "Telecommunication infrastructure, cellular and fiber services",
        "employee_count": "25000+",
        "tech_stack": ["GCP", "Kubernetes", "PostgreSQL"],
    }
    response = client.post("/api/companies", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "PT Telkom Indonesia Tbk"
    assert data["normalized_name"] == "telkom indonesia"
    assert data["website"] == "https://telkom.co.id"
    assert data["industry"] == "Telecommunications"
    assert data["opportunities_count"] == 0

    # Also check /api/v1/companies prefix works identically
    response_v1 = client.get("/api/v1/companies", headers=auth_headers)
    assert response_v1.status_code == 200
    assert response_v1.json()["total"] == 1


def test_create_company_duplicate_conflict(client: TestClient, auth_headers: dict[str, str]):
    payload1 = {
        "name": "Cardig Aero Services",
        "website": "cas.co.id",
        "industry": "Aviation",
    }
    res1 = client.post("/api/companies", json=payload1, headers=auth_headers)
    assert res1.status_code == 201

    # Attempt to create with PT prefix should resolve to same normalized name and conflict
    payload2 = {
        "name": "PT Cardig Aero Services",
        "website": "cas.co.id",
        "industry": "Aviation",
    }
    res2 = client.post("/api/companies", json=payload2, headers=auth_headers)
    assert res2.status_code == 409
    assert "already exists" in res2.json()["detail"]


def test_get_company_detail_with_opportunities(
    client: TestClient, auth_headers: dict[str, str], db: Session, test_user: User
):
    comp = Company(
        id=uuid.uuid4(),
        name="PT Bank Mandiri (Persero) Tbk",
        normalized_name="bank mandiri",
        website="https://bankmandiri.co.id",
        industry="Banking",
    )
    db.add(comp)
    db.flush()

    opp1 = Opportunity(
        id=uuid.uuid4(),
        company_id=comp.id,
        company_name=comp.name,
        customer_needs="Cloud Migration and Disaster Recovery",
        product="GCP Migration",
        created_by=test_user.id,
        status="New",
    )
    opp2 = Opportunity(
        id=uuid.uuid4(),
        company_id=comp.id,
        company_name=comp.name,
        customer_needs="AI Fraud Detection Engine",
        product="Vertex AI",
        created_by=test_user.id,
        status="POC",
    )
    db.add_all([opp1, opp2])
    db.commit()

    response = client.get(f"/api/companies/{comp.id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "PT Bank Mandiri (Persero) Tbk"
    assert data["opportunities_count"] == 2
    assert len(data["opportunities"]) == 2
    products = {o["product"] for o in data["opportunities"]}
    assert "GCP Migration" in products
    assert "Vertex AI" in products


def test_update_company(client: TestClient, auth_headers: dict[str, str], db: Session):
    comp = Company(
        id=uuid.uuid4(),
        name="Startup Media Group",
        normalized_name="startup media group",
        website="https://startupmedia.id",
        industry="Media",
    )
    db.add(comp)
    db.commit()

    update_payload = {
        "name": "PT Startup Media Digital",
        "employee_count": "100-250",
    }
    response = client.patch(f"/api/companies/{comp.id}", json=update_payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "PT Startup Media Digital"
    assert data["normalized_name"] == "startup media digital"
    assert data["employee_count"] == "100-250"


def test_delete_company(client: TestClient, admin_auth_headers: dict[str, str], db: Session):
    comp = Company(
        id=uuid.uuid4(),
        name="Temporary Company",
        normalized_name="temporary company",
    )
    db.add(comp)
    db.commit()

    res = client.delete(f"/api/companies/{comp.id}", headers=admin_auth_headers)
    assert res.status_code == 204

    check = db.query(Company).filter(Company.id == comp.id).first()
    assert check is None


def test_create_nested_opportunity_inherits_metadata(
    client: TestClient, auth_headers: dict[str, str], db: Session, test_user: User
):
    comp = Company(
        id=uuid.uuid4(),
        name="PT SMBC Indonesia",
        normalized_name="smbc indonesia",
        website="https://smbc.co.id",
        industry="Banking & Financial Services",
    )
    db.add(comp)
    db.commit()

    nested_payload = {
        "deal_title": "Enterprise Backup & Disaster Recovery",
        "product": "Veeam / Dell Data Protection",
        "customer_needs": "Need automated off-site immutable backup complying with OJK residency regulation.",
        "contact_name": "Budi Santoso",
        "email": "budi@smbc.co.id",
        "potential_revenue": 750000000.0,
    }

    # Use /api/v1/companies/{company_id}/opportunities
    response = client.post(
        f"/api/v1/companies/{comp.id}/opportunities",
        json=nested_payload,
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()

    # Verify company inheritance
    assert data["company_id"] == str(comp.id)
    assert data["company_name"] == "PT SMBC Indonesia"
    assert data["website"] == "https://smbc.co.id"
    assert data["industry"] == "Banking & Financial Services"
    assert data["product"] == "Veeam / Dell Data Protection"
    assert data["contact_name"] == "Budi Santoso"
    assert data["status"] == "New"
    assert data["potential_revenue"] == 750000000.0

    # Verify in DB
    opp_db = db.query(Opportunity).filter(Opportunity.id == uuid.UUID(data["id"])).first()
    assert opp_db is not None
    assert opp_db.company_id == comp.id
    assert opp_db.company.name == "PT SMBC Indonesia"


def test_move_opportunity_between_companies(
    client: TestClient, auth_headers: dict[str, str], db: Session, test_user: User
):
    comp_a = Company(
        id=uuid.uuid4(),
        name="Company Alpha",
        normalized_name="company alpha",
        website="https://alpha.com",
        industry="Technology",
    )
    comp_b = Company(
        id=uuid.uuid4(),
        name="Company Beta",
        normalized_name="company beta",
        website="https://beta.com",
        industry="Logistics",
    )
    db.add_all([comp_a, comp_b])
    db.commit()

    opp = Opportunity(
        id=uuid.uuid4(),
        company_id=comp_a.id,
        company_name=comp_a.name,
        website=comp_a.website,
        industry=comp_a.industry,
        customer_needs="Alpha deal needs",
        created_by=test_user.id,
        status="New",
    )
    db.add(opp)
    db.commit()

    # Move to comp_b via PATCH
    res = client.patch(
        f"/api/opportunities/{opp.id}",
        json={"company_id": str(comp_b.id)},
        headers=auth_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["company_id"] == str(comp_b.id)
    assert data["company_name"] == "Company Beta"
    assert data["website"] == "https://beta.com"
    assert data["industry"] == "Logistics"

    # Verify DB relationship
    db.refresh(opp)
    assert opp.company_id == comp_b.id
    assert opp.company_name == "Company Beta"


def test_recursive_normalization_compound_suffixes():
    from app.api.companies import compute_normalized_name

    cases = [
        ("PT Telkom Indonesia (Persero) Tbk", "telkom indonesia"),
        ("PT. Telkom Indonesia, Tbk.", "telkom indonesia"),
        ("Telkom Indonesia", "telkom indonesia"),
        ("PT Bank Mandiri (Persero) Tbk", "bank mandiri"),
        ("Bank Mandiri", "bank mandiri"),
        ("PT Bank Central Asia Tbk", "bank central asia"),
        ("Cardig Aero Services", "cardig aero services"),
        ("PT Cardig Aero Services", "cardig aero services"),
        ("PT Prodia Widyahusada Tbk", "prodia widyahusada"),
        ("PT. Indoteknik Dotcom Gemilang", "indoteknik dotcom gemilang"),
    ]
    for raw, expected in cases:
        assert compute_normalized_name(raw) == expected, f"Failed for {raw}"


def test_check_company_similarity_exact_and_fuzzy(client: TestClient, auth_headers: dict[str, str], db: Session):
    comp = Company(
        id=uuid.uuid4(),
        name="PT Telkom Indonesia (Persero) Tbk",
        normalized_name="telkom indonesia",
        website="https://telkom.co.id",
        industry="Telecommunications",
    )
    db.add(comp)
    db.commit()

    # Exact match via alternate typing
    res_exact = client.get(
        "/api/v1/companies/check-similarity",
        params={"name": "Telkom Indonesia"},
        headers=auth_headers,
    )
    assert res_exact.status_code == 200
    data_exact = res_exact.json()
    assert data_exact["has_similar"] is True
    assert data_exact["exact_match"] is not None
    assert data_exact["exact_match"]["id"] == str(comp.id)

    # Fuzzy match via partial brand name
    res_fuzzy = client.get(
        "/api/v1/companies/check-similarity",
        params={"name": "Telkom"},
        headers=auth_headers,
    )
    assert res_fuzzy.status_code == 200
    data_fuzzy = res_fuzzy.json()
    assert data_fuzzy["has_similar"] is True
    assert len(data_fuzzy["matches"]) >= 1
    assert data_fuzzy["matches"][0]["company"]["id"] == str(comp.id)
    assert data_fuzzy["matches"][0]["similarity_score"] >= 0.70


def test_check_company_similarity_prevents_false_positives_indonesia(
    client: TestClient, auth_headers: dict[str, str], db: Session
):
    comp = Company(
        id=uuid.uuid4(),
        name="Danone Indonesia",
        normalized_name="danone indonesia",
        website="https://danone.co.id",
        industry="FMCG",
    )
    db.add(comp)
    db.commit()

    # Searching Google Indonesia should NOT flag Danone Indonesia despite both containing 'Indonesia'
    res = client.get(
        "/api/v1/companies/check-similarity",
        params={"name": "Google Indonesia"},
        headers=auth_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["exact_match"] is None
    # No matches should exceed the 0.70 threshold
    danone_matches = [m for m in data["matches"] if m["company"]["id"] == str(comp.id)]
    assert len(danone_matches) == 0


def test_extract_root_domain_various_formats():
    from app.api.companies import extract_root_domain

    assert extract_root_domain("https://www.telkom.co.id/id/about") == "telkom.co.id"
    assert extract_root_domain("https://enterprise.telkom.co.id/products") == "telkom.co.id"
    assert extract_root_domain("http://sub.danone.com") == "danone.com"
    assert extract_root_domain("www.bankmandiri.co.id") == "bankmandiri.co.id"
    assert extract_root_domain("https://portal.bankmandiri.co.id/login") == "bankmandiri.co.id"
    assert extract_root_domain("https://cas.co.id:8080/path") == "cas.co.id"
    # Public/shared domains must return None
    assert extract_root_domain("https://instagram.com/mycompany") is None
    assert extract_root_domain("https://linktr.ee/sales_magna") is None
    assert extract_root_domain("https://sites.google.com/view/test") is None
    assert extract_root_domain("") is None
    assert extract_root_domain(None) is None


def test_check_company_similarity_with_domain_match(client: TestClient, auth_headers: dict[str, str], db: Session):
    comp = Company(
        id=uuid.uuid4(),
        name="PT Cardig Aero Services Tbk",
        normalized_name="cardig aero services",
        website="https://cas.co.id",
        industry="Aviation & Logistics",
    )
    db.add(comp)
    db.commit()

    # User types completely different name 'CAS Logistics' but inputs 'https://www.cas.co.id/portal'
    res = client.get(
        "/api/v1/companies/check-similarity",
        params={
            "name": "CAS Logistics",
            "website": "https://www.cas.co.id/portal",
        },
        headers=auth_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["has_similar"] is True
    assert data["exact_match"] is not None
    assert data["exact_match"]["id"] == str(comp.id)
    assert len(data["matches"]) >= 1
    assert data["matches"][0]["match_type"] == "domain_match"
    assert data["matches"][0]["similarity_score"] == 1.0


def test_create_company_domain_conflict(client: TestClient, auth_headers: dict[str, str], db: Session):
    comp = Company(
        id=uuid.uuid4(),
        name="PT Telkom Indonesia",
        normalized_name="telkom indonesia",
        website="https://telkom.co.id",
        industry="Telecommunications",
    )
    db.add(comp)
    db.commit()

    # Attempting to register another company folder with the same domain should raise 409 Conflict
    payload = {
        "name": "Telkom Enterprise Division",
        "website": "https://enterprise.telkom.co.id",
        "industry": "Telecommunications",
    }
    res = client.post("/api/v1/companies", json=payload, headers=auth_headers)
    assert res.status_code == 409
    assert "telkom.co.id" in res.json()["detail"]


def test_create_opportunity_domain_autolink(client: TestClient, auth_headers: dict[str, str], db: Session):
    comp = Company(
        id=uuid.uuid4(),
        name="PT Prodia Widyahusada Tbk",
        normalized_name="prodia widyahusada",
        website="https://prodia.co.id",
        industry="Healthcare",
    )
    db.add(comp)
    db.commit()

    # Opportunity created without company_id but with matching domain 'prodia.co.id'
    payload = {
        "company_name": "Prodia Diagnostic Laboratory",
        "website": "https://www.prodia.co.id/id/layanan",
        "industry": "Healthcare",
        "customer_needs": "Health record system integration",
    }
    res = client.post("/api/opportunities", json=payload, headers=auth_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["company_id"] == str(comp.id)

