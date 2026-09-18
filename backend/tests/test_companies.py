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
