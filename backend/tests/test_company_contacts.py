"""
backend/tests/test_company_contacts.py

Unit tests for Company Contacts (Stakeholders Directory) endpoints and logic.
"""

import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.company_contact import CompanyContact
from app.models.opportunity import Opportunity
from app.models.user import User


@pytest.fixture
def sample_company(db: Session) -> Company:
    company = Company(
        id=uuid.uuid4(),
        name="PT Bank Central Asia Tbk",
        normalized_name="bank central asia",
        website="https://bca.co.id",
        industry="Banking",
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


def test_list_contacts_unauthenticated(client: TestClient, sample_company: Company):
    response = client.get(f"/api/v1/companies/{sample_company.id}/contacts")
    assert response.status_code == 401


def test_create_and_list_contacts(
    client: TestClient, auth_headers: dict[str, str], sample_company: Company
):
    # 1. Create first contact (not primary)
    payload1 = {
        "name": "Budi Santoso",
        "job_title": "Head of Enterprise Architecture",
        "department": "IT Strategy",
        "email": "budi.santoso@bca.co.id",
        "phone": "+6281234567890",
        "linkedin_url": "linkedin.com/in/budisantoso",
        "is_primary": False,
        "notes": "Prefers WhatsApp",
    }
    res1 = client.post(
        f"/api/v1/companies/{sample_company.id}/contacts",
        json=payload1,
        headers=auth_headers,
    )
    assert res1.status_code == 201
    data1 = res1.json()
    assert data1["name"] == "Budi Santoso"
    assert data1["job_title"] == "Head of Enterprise Architecture"
    assert data1["linkedin_url"] == "https://linkedin.com/in/budisantoso"
    assert data1["is_primary"] is False
    assert data1["company_id"] == str(sample_company.id)

    # 2. Create second contact marked as primary
    payload2 = {
        "name": "Siti Rahma",
        "job_title": "Chief Information Officer",
        "department": "C-Level",
        "email": "siti.rahma@bca.co.id",
        "is_primary": True,
    }
    res2 = client.post(
        f"/api/v1/companies/{sample_company.id}/contacts",
        json=payload2,
        headers=auth_headers,
    )
    assert res2.status_code == 201
    data2 = res2.json()
    assert data2["name"] == "Siti Rahma"
    assert data2["is_primary"] is True

    # 3. List contacts -> Primary should be first
    list_res = client.get(
        f"/api/v1/companies/{sample_company.id}/contacts",
        headers=auth_headers,
    )
    assert list_res.status_code == 200
    list_data = list_res.json()


def test_primary_contact_auto_unsets_previous_primary(
    client: TestClient, auth_headers: dict[str, str], sample_company: Company
):
    # Create contact 1 as primary
    res1 = client.post(
        f"/api/v1/companies/{sample_company.id}/contacts",
        json={"name": "Alice", "job_title": "Director", "is_primary": True},
        headers=auth_headers,
    )
    assert res1.status_code == 201
    c1_id = res1.json()["id"]

    # Create contact 2 as primary -> contact 1 should be demoted
    res2 = client.post(
        f"/api/v1/companies/{sample_company.id}/contacts",
        json={"name": "Bob", "job_title": "VP IT", "is_primary": True},
        headers=auth_headers,
    )
    assert res2.status_code == 201
    c2_id = res2.json()["id"]

    # Check c1 is now is_primary = False
    get_c1 = client.get(
        f"/api/v1/companies/{sample_company.id}/contacts/{c1_id}",
        headers=auth_headers,
    )
    assert get_c1.status_code == 200
    assert get_c1.json()["is_primary"] is False

    # Check c2 is is_primary = True
    get_c2 = client.get(
        f"/api/v1/companies/{sample_company.id}/contacts/{c2_id}",
        headers=auth_headers,
    )
    assert get_c2.status_code == 200
    assert get_c2.json()["is_primary"] is True


def test_update_contact(
    client: TestClient, auth_headers: dict[str, str], sample_company: Company
):
    res = client.post(
        f"/api/v1/companies/{sample_company.id}/contacts",
        json={"name": "Charles", "job_title": "Engineer"},
        headers=auth_headers,
    )
    c_id = res.json()["id"]

    patch_res = client.patch(
        f"/api/v1/companies/{sample_company.id}/contacts/{c_id}",
        json={"job_title": "Lead Engineer", "department": "Infrastructure"},
        headers=auth_headers,
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["job_title"] == "Lead Engineer"
    assert updated["department"] == "Infrastructure"
    assert updated["name"] == "Charles"


def test_delete_contact(
    client: TestClient, auth_headers: dict[str, str], sample_company: Company
):
    res = client.post(
        f"/api/v1/companies/{sample_company.id}/contacts",
        json={"name": "David", "job_title": "Manager"},
        headers=auth_headers,
    )
    c_id = res.json()["id"]

    del_res = client.delete(
        f"/api/v1/companies/{sample_company.id}/contacts/{c_id}",
        headers=auth_headers,
    )
    assert del_res.status_code == 204

    get_res = client.get(
        f"/api/v1/companies/{sample_company.id}/contacts/{c_id}",
        headers=auth_headers,
    )
    assert get_res.status_code == 404


def test_contact_not_found_on_invalid_company(
    client: TestClient, auth_headers: dict[str, str]
):
    random_id = uuid.uuid4()
    res = client.get(
        f"/api/v1/companies/{random_id}/contacts",
        headers=auth_headers,
    )
    assert res.status_code == 404


def test_global_search_includes_contacts(
    client: TestClient,
    auth_headers: dict[str, str],
    sample_company: Company,
    db: Session,
    test_user: User,
):
    opp = Opportunity(
        id=uuid.uuid4(),
        company_id=sample_company.id,
        company_name=sample_company.name,
        customer_needs="Cloud Migration",
        created_by=test_user.id,
    )
    db.add(opp)
    db.commit()

    contact = CompanyContact(
        id=uuid.uuid4(),
        company_id=sample_company.id,
        name="Hendrawan Prabowo",
        job_title="VP Enterprise Architecture",
        department="IT",
        email="hendrawan@bca.co.id",
    )
    db.add(contact)
    db.commit()

    search_res = client.get(
        "/api/opportunities/search/global?q=Hendrawan",
        headers=auth_headers,
    )
    assert search_res.status_code == 200
    data = search_res.json()
    assert "contacts" in data
    assert len(data["contacts"]) >= 1
    found = data["contacts"][0]
    assert found["name"] == "Hendrawan Prabowo"
    assert found["job_title"] == "VP Enterprise Architecture"
    assert found["company_name"] == sample_company.name
