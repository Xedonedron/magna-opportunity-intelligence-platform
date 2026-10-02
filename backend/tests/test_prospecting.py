"""Tests for Prospecting Hub & Lusha API Outbound Integration."""

from unittest.mock import AsyncMock, patch
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.company_contact import CompanyContact
from app.models.opportunity import Opportunity, TimelineEvent
from app.models.user import User


class TestProspectingLushaUsage:
    """Test Lusha Usage Endpoint."""

    @patch("app.api.prospecting.lusha_service.get_account_usage", new_callable=AsyncMock)
    def test_get_usage_success(self, mock_get_usage, client: TestClient):
        mock_get_usage.return_value = {
            "plan": "Starter",
            "credits_total": 4820,
            "credits_used": 1838,
            "credits_remaining": 2982,
            "features": {"contactSearch": 1, "revealEmail": 1, "revealPhone": 5},
            "rate_limit_per_minute": 40,
            "rate_limit_per_day": 100,
        }

        response = client.get("/api/prospecting/lusha/usage")
        assert response.status_code == 200
        data = response.json()
        assert data["credits_remaining"] == 2982
        assert data["plan"] == "Starter"


class TestProspectingLushaSearch:
    """Test Lusha Prospecting Search Endpoint."""

    def test_search_missing_company_name(self, client: TestClient):
        response = client.post("/api/prospecting/lusha/search", json={"company_name": ""})
        assert response.status_code in (400, 422)

    @patch("app.api.prospecting.lusha_service.search_contacts", new_callable=AsyncMock)
    def test_search_contacts_success(self, mock_search, client: TestClient):
        mock_search.return_value = {
            "success": True,
            "total": 1,
            "page": 0,
            "contacts": [
                {
                    "id": "123456",
                    "full_name": "Agus Pratama",
                    "first_name": "Agus",
                    "last_name": "Pratama",
                    "job_title": "Head of IT Infrastructure",
                    "company_name": "PT Bank Mega Tbk",
                    "company_domain": "bankmega.com",
                    "location": "Jakarta, Indonesia",
                    "linkedin_url": "https://linkedin.com/in/agus-pratama",
                    "has_email": True,
                    "has_phone": True,
                }
            ],
            "message": "Ditemukan 1 kontak terverifikasi di Lusha.",
        }

        response = client.post(
            "/api/prospecting/lusha/search",
            json={
                "company_name": "Bank Mega",
                "country": "Indonesia",
                "seniority": "head_lead",
                "job_function": "network",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["contacts"]) == 1
        assert data["contacts"][0]["full_name"] == "Agus Pratama"


class TestProspectingLushaEnrich:
    """Test Lusha Contact Enrichment Endpoint."""

    @patch("app.api.prospecting.lusha_service.enrich_contact", new_callable=AsyncMock)
    def test_enrich_contact_success(self, mock_enrich, client: TestClient):
        mock_enrich.return_value = {
            "success": True,
            "contact_id": "123456",
            "emails": ["agus.pratama@bankmega.com"],
            "phones": ["+6281234567890"],
            "message": "Kontak berhasil diperkaya dengan data terverifikasi Lusha.",
        }

        response = client.post(
            "/api/prospecting/lusha/enrich",
            json={"contact_id": "123456", "reveal": ["emails", "phones"]},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "agus.pratama@bankmega.com" in data["emails"]
        assert "+6281234567890" in data["phones"]


class TestProspectingGenerate:
    """Test Sales Hypothesis & Outreach Generation."""

    def test_generate_dossier_network(self, client: TestClient):
        payload = {
            "company_name": "PT Bank Mega Tbk",
            "industry": "Financial Services",
            "job_function": "network",
            "seniority": "head_lead",
            "contact": {
                "full_name": "Agus Pratama",
                "job_title": "Head of IT Network & Telecom",
                "email": "agus.pratama@bankmega.com",
                "phone": "+6281234567890",
            },
        }
        response = client.post("/api/prospecting/generate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["company_name"] == "PT Bank Mega Tbk"
        assert "SD-WAN" in data["hypothesis"]["recommended_solution"]
        assert len(data["hypothesis"]["pain_points"]) >= 3
        assert "Dan dari tim Solution Architect" in data["outreach"]["whatsapp"]
        assert len(data["discovery_questions"]) >= 4

    def test_generate_dossier_security_c_level(self, client: TestClient):
        payload = {
            "company_name": "PT Telkom Indonesia Tbk",
            "job_function": "security",
            "seniority": "c_level",
            "contact": {
                "full_name": "Budi Santoso",
                "job_title": "Chief Information Security Officer",
            },
        }
        response = client.post("/api/prospecting/generate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "Zero-Trust" in data["hypothesis"]["recommended_solution"]
        assert "Solution Advisory" in data["outreach"]["whatsapp"]


class TestProspectingConvert:
    """Test Atomic Conversion of Prospect to Opportunity & Database Records."""

    def test_convert_to_opportunity_success(
        self,
        client: TestClient,
        lgo_auth_headers: dict[str, str],
        db: Session,
        lgo_user: User,
    ):
        payload = {
            "company_name": "PT Bank Mega Tbk",
            "industry": "Banking & Financial Services",
            "website": "https://www.bankmega.com",
            "contact": {
                "full_name": "Agus Pratama",
                "job_title": "Head of IT Network",
                "department": "IT",
                "email": "agus.pratama@bankmega.com",
                "phone": "+628****7890",
                "linkedin_url": "https://linkedin.com/in/agus-pratama",
            },
            "hypothesis": {
                "pain_points": [
                    "Kompleksitas routing multi-cabang & latensi tinggi",
                    "OPEX leased line konvensional tinggi",
                ],
                "recommended_solution": "Automated SD-WAN & Enterprise Campus Network",
                "solution_pillar": "Network & Enterprise Workplace",
                "tech_stack": ["Cisco Catalyst", "Fortinet Secure SD-WAN"],
                "key_benefits": ["Reduksi biaya bandwidth hingga 40%"],
            },
            "opportunity": {
                "title": "Modernisasi SD-WAN 300+ Cabang Bank Mega",
                "notes": "Target implementasi Q4 2026",
                "estimated_value": 750000000.0,
            },
        }

        response = client.post(
            "/api/prospecting/convert",
            json=payload,
            headers=lgo_auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "opportunity_id" in data
        assert "company_id" in data
        assert "contact_id" in data

        # Verify Database state
        import uuid as _uuid
        company = db.query(Company).filter(Company.id == _uuid.UUID(data["company_id"])).first()
        assert company is not None
        assert "bank mega" in company.normalized_name

        contact = db.query(CompanyContact).filter(CompanyContact.id == _uuid.UUID(data["contact_id"])).first()
        assert contact is not None
        assert contact.email == "agus.pratama@bankmega.com"
        assert contact.company_id == company.id

        opp = db.query(Opportunity).filter(Opportunity.id == _uuid.UUID(data["opportunity_id"])).first()
        assert opp is not None
        assert opp.company_id == company.id
        assert opp.primary_contact_id == contact.id
        assert opp.potential_revenue == 750000000.0
        assert "SD-WAN" in opp.product

        timeline = (
            db.query(TimelineEvent)
            .filter(TimelineEvent.opportunity_id == opp.id)
            .first()
        )
        assert timeline is not None
        assert timeline.action == "Prospecting Converted"

    def test_convert_to_opportunity_forbidden_for_unauthorized_role(
        self,
        client: TestClient,
        auth_headers: dict[str, str],
    ):
        """Verify role without LGO/Manager/Superadmin or prospecting capability gets 403 Forbidden."""
        payload = {
            "company_name": "Unauthorized Access PT",
            "contact": {
                "full_name": "John Doe",
                "job_title": "Staff",
            },
        }
        response = client.post(
            "/api/prospecting/convert",
            json=payload,
            headers=auth_headers,
        )
        assert response.status_code == 403
        detail = response.json().get("detail", "")
        assert "Akses fitur Lusha Prospecting terbatas" in detail

    def test_prospecting_allowed_with_explicit_capability(
        self,
        client: TestClient,
        db: Session,
    ):
        """Verify a user with non-standard role can access prospecting if capability is granted."""
        import uuid as _uuid
        from app.services.auth import create_access_token

        custom_user = User(
            id=_uuid.uuid4(),
            email="specialist@smartnet.co.id",
            full_name="Specialist User",
            role="staff",
            capabilities="view,prospecting",
            is_active=True,
        )
        db.add(custom_user)
        db.commit()

        token = create_access_token(data={"sub": str(custom_user.id), "email": custom_user.email})
        headers = {"Authorization": f"Bearer {token}"}

        payload = {
            "company_name": "PT Fintek Nusantara",
            "industry": "Fintech",
            "job_function": "it",
            "seniority": "c_level",
            "contact": {
                "full_name": "Budi Santoso",
                "job_title": "CTO",
            },
        }
        response = client.post(
            "/api/prospecting/generate",
            json=payload,
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["company_name"] == "PT Fintek Nusantara"
