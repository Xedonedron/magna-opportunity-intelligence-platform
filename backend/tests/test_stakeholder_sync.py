import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.company_contact import CompanyContact
from app.models.opportunity import Opportunity


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


class TestStakeholderSync:
    """Tests ensuring opportunity contacts and company stakeholders are unified."""

    def test_create_opportunity_with_contact_auto_creates_stakeholder(
        self, client: TestClient, auth_headers: dict[str, str], db: Session
    ):
        """When creating an opportunity with contact PIC, it should automatically create a CompanyContact."""
        response = client.post(
            "/api/opportunities",
            headers=auth_headers,
            json={
                "company_name": "Sync Tech Global",
                "website": "synctech.com",
                "industry": "Technology",
                "customer_needs": "Need Cloud Migration and AI Platform",
                "contact_name": "Budi Santoso",
                "email": "budi@synctech.com",
                "phone": "+628123456789",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["contact_name"] == "Budi Santoso"
        assert data["email"] == "budi@synctech.com"
        assert data["phone"] == "+628123456789"
        assert data.get("primary_contact_id") is not None
        company_id = data["company_id"]
        assert company_id is not None

        # Verify that CompanyContact was created under the company
        contacts_res = client.get(
            f"/api/companies/{company_id}/contacts",
            headers=auth_headers,
        )
        assert contacts_res.status_code == 200
        contacts_data = contacts_res.json()
        assert contacts_data["total"] >= 1
        created_contact = next(
            (c for c in contacts_data["items"] if c["name"] == "Budi Santoso"), None
        )
        assert created_contact is not None
        assert created_contact["id"] == data["primary_contact_id"]
        assert created_contact["email"] == "budi@synctech.com"
        assert created_contact["phone"] == "+628123456789"
        assert created_contact["is_primary"] is True

    def test_create_opportunity_with_existing_primary_contact_id(
        self, client: TestClient, auth_headers: dict[str, str], sample_company: Company, db: Session
    ):
        """When passing primary_contact_id, opportunity should link directly and populate contact info."""
        # Create a contact first
        contact = CompanyContact(
            company_id=sample_company.id,
            name="Siti Rahma",
            email="siti@testcompany.com",
            phone="08198765432",
            job_title="VP Engineering",
            is_primary=True,
        )
        db.add(contact)
        db.commit()
        db.refresh(contact)

        # Create opportunity specifying primary_contact_id
        response = client.post(
            "/api/opportunities",
            headers=auth_headers,
            json={
                "company_id": str(sample_company.id),
                "company_name": sample_company.name,
                "website": sample_company.website,
                "industry": sample_company.industry,
                "customer_needs": "Big Data Analytics",
                "primary_contact_id": str(contact.id),
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["primary_contact_id"] == str(contact.id)
        assert data["contact_name"] == "Siti Rahma"
        assert data["email"] == "siti@testcompany.com"
        assert data["phone"] == "08198765432"

    def test_create_company_with_contact_auto_creates_primary_stakeholder(
        self, client: TestClient, auth_headers: dict[str, str]
    ):
        """When creating a company folder with contact info, it should auto-create the CompanyContact."""
        response = client.post(
            "/api/companies",
            headers=auth_headers,
            json={
                "name": "Nusantara Digital Solusindo",
                "website": "https://nusantaradigital.id",
                "industry": "Consulting",
                "contact_name": "Agus Salim",
                "contact_email": "agus@nusantaradigital.id",
                "contact_phone": "081122334455",
            },
        )
        assert response.status_code == 201
        comp = response.json()
        comp_id = comp["id"]

        # Check contacts endpoint
        contacts_res = client.get(
            f"/api/companies/{comp_id}/contacts",
            headers=auth_headers,
        )
        assert contacts_res.status_code == 200
        contacts = contacts_res.json()["items"]
        assert len(contacts) == 1
        assert contacts[0]["name"] == "Agus Salim"
        assert contacts[0]["email"] == "agus@nusantaradigital.id"
        assert contacts[0]["phone"] == "081122334455"
        assert contacts[0]["is_primary"] is True

    def test_create_company_opportunity_auto_creates_or_links_stakeholder(
        self, client: TestClient, auth_headers: dict[str, str], sample_company: Company
    ):
        """Creating opportunity from within company folder should register or link stakeholder."""
        response = client.post(
            f"/api/companies/{sample_company.id}/opportunities",
            headers=auth_headers,
            json={
                "deal_title": "Enterprise Cloud License",
                "customer_needs": "Migration from on-prem to AWS",
                "contact_name": "Dewi Sartika",
                "email": "dewi@testcompany.com",
                "phone": "+628777777777",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["contact_name"] == "Dewi Sartika"
        assert data.get("primary_contact_id") is not None

        # Verify contact in company folder
        contacts_res = client.get(
            f"/api/companies/{sample_company.id}/contacts",
            headers=auth_headers,
        )
        assert contacts_res.status_code == 200
        contacts = contacts_res.json()["items"]
        dewi = next((c for c in contacts if c["name"] == "Dewi Sartika"), None)
        assert dewi is not None
        assert dewi["email"] == "dewi@testcompany.com"

    def test_create_opportunity_without_contact_and_later_stakeholder_link(
        self, client: TestClient, auth_headers: dict[str, str], db: Session
    ):
        """Option 1 flow: creating an opportunity with NO contact pic info, then managing stakeholder later."""
        # 1. Create opportunity cleanly with no contact fields
        create_res = client.post(
            "/api/opportunities",
            headers=auth_headers,
            json={
                "company_name": "Lean Prospek Indonesia",
                "website": "https://leanprospek.id",
                "industry": "Fintech",
                "customer_needs": "Core banking microservices",
            },
        )
        assert create_res.status_code == 201
        opp_data = create_res.json()
        opp_id = opp_data["id"]
        company_id = opp_data["company_id"]
        assert company_id is not None
        assert opp_data["contact_name"] is None
        assert opp_data.get("primary_contact_id") is None

        # 2. Add stakeholder via company stakeholder directory
        add_contact_res = client.post(
            f"/api/companies/{company_id}/contacts",
            headers=auth_headers,
            json={
                "name": "Iwan Setiawan",
                "email": "iwan@leanprospek.id",
                "phone": "08123456789",
                "job_title": "Head of IT",
                "is_primary": True,
            },
        )
        assert add_contact_res.status_code == 201
        contact_id = add_contact_res.json()["id"]

        # 3. GET opportunity detail should automatically resolve the company's primary contact
        detail_res = client.get(f"/api/opportunities/{opp_id}", headers=auth_headers)
        assert detail_res.status_code == 200
        detail_data = detail_res.json()
        assert detail_data["contact_name"] == "Iwan Setiawan"
        assert detail_data["primary_contact"] is not None
        assert detail_data["primary_contact"]["id"] == contact_id
        assert detail_data["primary_contact"]["name"] == "Iwan Setiawan"
        assert detail_data["primary_contact"]["job_title"] == "Head of IT"

        # 4. Creating a second opportunity for the same company automatically inherits primary contact
        second_opp_res = client.post(
            "/api/opportunities",
            headers=auth_headers,
            json={
                "company_id": company_id,
                "company_name": "Lean Prospek Indonesia",
                "website": "https://leanprospek.id",
                "industry": "Fintech",
                "customer_needs": "Security Audit Q4",
            },
        )
        assert second_opp_res.status_code == 201
        second_opp = second_opp_res.json()
        assert second_opp["primary_contact_id"] == contact_id
        assert second_opp["contact_name"] == "Iwan Setiawan"
