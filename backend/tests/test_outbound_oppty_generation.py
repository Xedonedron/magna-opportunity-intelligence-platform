"""
Comprehensive test suite for Outbound Opportunity Generation feature.

Covers:
1. convert_stakeholders_to_opportunity endpoint and service logic
2. 4 Magna pillars detection accuracy (security, data, cloud, network, false-positives)
3. Single and multi-stakeholder scenarios with primary contact resolution
4. Existing company vs new company auto-creation
5. Candidate contacts persistence and deduplication
6. Validation errors (invalid company_id, missing contacts)
7. Customer needs dossier formatting (no LaTeX, proper '-' bullets, Magna solutions)
8. TimelineEvent audit creation
"""

from __future__ import annotations

import uuid
from typing import List

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.company_contact import CompanyContact
from app.models.opportunity import Opportunity, TimelineEvent
from app.models.user import User
from app.services.prospecting_service import ProspectingService, PILLAR_INTELLIGENCE
from app.schemas.prospecting import (
    ConvertStakeholdersToOpportunityRequest,
    StakeholderOpportunityContactInput,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def enable_prospecting(monkeypatch):
    """Ensure Prospecting feature flag is always on during these tests."""
    from app.core.config import get_settings
    settings = get_settings()
    monkeypatch.setattr(settings, "ENABLE_PROSPECTING", True)


@pytest.fixture
def service() -> ProspectingService:
    return ProspectingService()


@pytest.fixture
def bank_company(db: Session) -> Company:
    """Pre-existing company in the database."""
    comp = Company(
        id=uuid.uuid4(),
        name="PT Bank Mandiri Tbk",
        normalized_name="bank mandiri",
        industry="Banking & Financial Services",
        website="https://www.bankmandiri.co.id",
    )
    db.add(comp)
    db.commit()
    db.refresh(comp)
    return comp


@pytest.fixture
def security_contact(db: Session, bank_company: Company) -> CompanyContact:
    contact = CompanyContact(
        id=uuid.uuid4(),
        company_id=bank_company.id,
        name="Andi Wijaya",
        job_title="Chief Information Security Officer",
        department="Cybersecurity",
        email="andi.wijaya@bankmandiri.co.id",
        phone="+6281234567890",
        is_primary=True,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@pytest.fixture
def network_contact(db: Session, bank_company: Company) -> CompanyContact:
    contact = CompanyContact(
        id=uuid.uuid4(),
        company_id=bank_company.id,
        name="Budi Santoso",
        job_title="Head of Network & Telecom",
        department="IT Infrastructure",
        email="budi.santoso@bankmandiri.co.id",
        phone="+6281234567891",
        is_primary=False,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@pytest.fixture
def lgo_auth_headers_prospecting(lgo_user: User) -> dict:
    from app.services.auth import create_access_token
    token = create_access_token(data={"sub": str(lgo_user.id), "email": lgo_user.email})
    return {"Authorization": f"Bearer {token}"}


# ===========================================================================
# Section 1 - Pillar Detection Accuracy
# ===========================================================================

class TestPillarDetection:
    """Unit-level tests for detect_pillar_from_titles static method."""

    def test_security_pillar_from_ciso(self, service):
        result = service.detect_pillar_from_titles(["Chief Information Security Officer"])
        assert result == "security"

    def test_security_pillar_from_soc(self, service):
        result = service.detect_pillar_from_titles(["SOC Analyst", "Security Engineer"])
        assert result == "security"

    def test_security_pillar_from_firewall(self, service):
        result = service.detect_pillar_from_titles(["Firewall Engineer"])
        assert result == "security"

    def test_security_pillar_from_infosec(self, service):
        result = service.detect_pillar_from_titles(["Head of Infosec & Compliance"])
        assert result == "security"

    def test_security_pillar_from_keamanan(self, service):
        result = service.detect_pillar_from_titles(["Manajer Keamanan Siber"])
        assert result == "security"

    def test_data_pillar_from_bigquery(self, service):
        result = service.detect_pillar_from_titles(["BigQuery Data Engineer"])
        assert result == "data"

    def test_data_pillar_from_ai_ml(self, service):
        result = service.detect_pillar_from_titles(["AI/ML Engineer", "Data Scientist"])
        assert result == "data"

    def test_data_pillar_from_dba(self, service):
        result = service.detect_pillar_from_titles(["Senior DBA / Database Administrator"])
        assert result == "data"

    def test_data_pillar_from_analytics(self, service):
        result = service.detect_pillar_from_titles(["Head of Analytics & BI"])
        assert result == "data"

    def test_cloud_pillar_from_nutanix(self, service):
        result = service.detect_pillar_from_titles(["Nutanix Cloud Architect"])
        assert result == "cloud"

    def test_cloud_pillar_from_devops(self, service):
        result = service.detect_pillar_from_titles(["DevOps / SRE Lead"])
        assert result == "cloud"

    def test_cloud_pillar_from_kubernetes(self, service):
        result = service.detect_pillar_from_titles(["Kubernetes Platform Engineer"])
        assert result == "cloud"

    def test_cloud_pillar_from_sysadmin(self, service):
        result = service.detect_pillar_from_titles(["SysAdmin & Datacenter Operations"])
        assert result == "cloud"

    def test_network_pillar_from_cisco(self, service):
        result = service.detect_pillar_from_titles(["Cisco Network Engineer"])
        assert result == "network"

    def test_network_pillar_from_sdwan(self, service):
        result = service.detect_pillar_from_titles(["SD-WAN Implementation Lead"])
        assert result == "network"

    def test_network_pillar_from_jaringan(self, service):
        result = service.detect_pillar_from_titles(["Kepala Jaringan & Telekomunikasi"])
        assert result == "network"

    def test_network_pillar_from_noc(self, service):
        result = service.detect_pillar_from_titles(["NOC Engineer", "LAN/WAN Specialist"])
        assert result == "network"

    def test_empty_titles_defaults_to_general(self, service):
        result = service.detect_pillar_from_titles([])
        assert result == "general"

    def test_none_entries_in_titles_handled(self, service):
        # List with None and empty strings - should not crash, default to general
        result = service.detect_pillar_from_titles(["", None, ""])
        assert result == "general"

    def test_no_keyword_match_defaults_to_general(self, service):
        result = service.detect_pillar_from_titles(["General Manager", "Commercial Director"])
        assert result == "general"

    # --- False-positive filtering ---
    def test_false_positive_financial_analyst_is_not_data(self, service):
        """'Financial Analyst' contains 'al' which should NOT trigger data pillar."""
        result = service.detect_pillar_from_titles(["Financial Analyst"])
        # Should NOT return data due to false-positive filter
        assert result != "data"

    def test_false_positive_business_analyst_is_not_data(self, service):
        result = service.detect_pillar_from_titles(["Business Analyst"])
        assert result != "data"

    def test_false_positive_sales_analyst_is_not_data(self, service):
        result = service.detect_pillar_from_titles(["Sales Analyst"])
        assert result != "data"

    def test_multi_title_highest_score_wins(self, service):
        """Three network-related titles vs one security title -> network wins."""
        titles = [
            "Head of Network Operations",
            "Cisco Routing Specialist",
            "NOC Team Lead",
            "IT Security Staff",  # one security keyword
        ]
        result = service.detect_pillar_from_titles(titles)
        assert result == "network"

    def test_pillar_detection_case_insensitive(self, service):
        result = service.detect_pillar_from_titles(["CISO - CHIEF INFORMATION SECURITY OFFICER"])
        assert result == "security"


# ===========================================================================
# Section 2 - Dossier Content & Formatting
# ===========================================================================

class TestDossierFormatting:
    """Validate customer_needs dossier: no LaTeX, '-' bullets, Magna content."""

    def _build_contacts(self, db, company):
        c1 = CompanyContact(
            id=uuid.uuid4(),
            company_id=company.id,
            name="Siti Rahayu",
            job_title="CISO",
            email="siti@bank.co.id",
            is_primary=True,
        )
        db.add(c1)
        db.commit()
        db.refresh(c1)
        return [c1]

    def test_dossier_has_no_latex_sequences(self, service, db, bank_company):
        contacts = self._build_contacts(db, bank_company)
        dossier = service.generate_stakeholder_opportunity_dossier(
            company_name=bank_company.name,
            pillar_key="security",
            solution_title="Zero-Trust & AI-Driven Managed SOC Defense",
            contacts=contacts,
            primary_contact=contacts[0],
        )
        # No LaTeX dollar signs, no \rightarrow, no \textbf, no math mode
        assert "$" not in dossier
        assert "\\rightarrow" not in dossier
        assert "\\textbf" not in dossier
        assert "\\frac" not in dossier

    def test_dossier_uses_hyphen_bullets_not_asterisks(self, service, db, bank_company):
        contacts = self._build_contacts(db, bank_company)
        dossier = service.generate_stakeholder_opportunity_dossier(
            company_name=bank_company.name,
            pillar_key="security",
            solution_title="Zero-Trust Architecture",
            contacts=contacts,
            primary_contact=contacts[0],
        )
        lines = dossier.splitlines()
        list_lines = [l for l in lines if l.strip().startswith("-")]
        # Should have list items using '-'
        assert len(list_lines) > 0, "Expected '-' bullet list items in dossier"
        # No asterisk-based lists
        asterisk_lines = [l for l in lines if l.strip().startswith("*")]
        assert len(asterisk_lines) == 0, "Found forbidden asterisk bullets in dossier"

    def test_dossier_contains_magna_solution_title(self, service, db, bank_company):
        contacts = self._build_contacts(db, bank_company)
        solution = "Zero-Trust Architecture & AI-Driven Managed SOC Defense"
        dossier = service.generate_stakeholder_opportunity_dossier(
            company_name=bank_company.name,
            pillar_key="security",
            solution_title=solution,
            contacts=contacts,
        )
        assert solution in dossier

    def test_dossier_contains_pillar_name(self, service, db, bank_company):
        contacts = self._build_contacts(db, bank_company)
        dossier = service.generate_stakeholder_opportunity_dossier(
            company_name=bank_company.name,
            pillar_key="security",
            solution_title="Zero-Trust Architecture",
            contacts=contacts,
        )
        assert "Cybersecurity Suite" in dossier

    def test_dossier_contains_stakeholder_names(self, service, db, bank_company):
        contacts = self._build_contacts(db, bank_company)
        dossier = service.generate_stakeholder_opportunity_dossier(
            company_name=bank_company.name,
            pillar_key="security",
            solution_title="Zero-Trust Architecture",
            contacts=contacts,
            primary_contact=contacts[0],
        )
        assert "Siti Rahayu" in dossier
        assert "CISO" in dossier

    def test_dossier_primary_pic_label(self, service, db, bank_company):
        contacts = self._build_contacts(db, bank_company)
        dossier = service.generate_stakeholder_opportunity_dossier(
            company_name=bank_company.name,
            pillar_key="security",
            solution_title="Zero-Trust Architecture",
            contacts=contacts,
            primary_contact=contacts[0],
        )
        assert "[Primary PIC]" in dossier

    def test_dossier_custom_pain_points_override_defaults(self, service, db, bank_company):
        contacts = self._build_contacts(db, bank_company)
        custom_pp = ["Custom pain point A", "Custom pain point B"]
        dossier = service.generate_stakeholder_opportunity_dossier(
            company_name=bank_company.name,
            pillar_key="security",
            solution_title="Zero-Trust Architecture",
            contacts=contacts,
            custom_pain_points=custom_pp,
        )
        assert "Custom pain point A" in dossier
        assert "Custom pain point B" in dossier

    def test_dossier_custom_notes_section(self, service, db, bank_company):
        contacts = self._build_contacts(db, bank_company)
        dossier = service.generate_stakeholder_opportunity_dossier(
            company_name=bank_company.name,
            pillar_key="security",
            solution_title="Zero-Trust Architecture",
            contacts=contacts,
            custom_notes="Target demo Q4 2026",
        )
        assert "Target demo Q4 2026" in dossier
        assert "Catatan Strategis" in dossier

    def test_dossier_sections_all_present(self, service, db, bank_company):
        contacts = self._build_contacts(db, bank_company)
        dossier = service.generate_stakeholder_opportunity_dossier(
            company_name=bank_company.name,
            pillar_key="cloud",
            solution_title="Enterprise Hybrid Cloud",
            contacts=contacts,
        )
        assert "## 1." in dossier
        assert "## 2." in dossier
        assert "## 3." in dossier
        assert "## 4." in dossier
        assert "## 5." in dossier

    def test_dossier_all_four_pillars_produce_valid_output(self, service, db, bank_company):
        for pillar_key in ["security", "data", "cloud", "network"]:
            contacts = self._build_contacts(db, bank_company)
            intel = PILLAR_INTELLIGENCE[pillar_key]
            dossier = service.generate_stakeholder_opportunity_dossier(
                company_name=bank_company.name,
                pillar_key=pillar_key,
                solution_title=intel["solution"],
                contacts=contacts,
            )
            assert intel["pillar"] in dossier
            assert intel["solution"] in dossier
            assert len(dossier) > 200

    def test_dossier_no_empty_bullet_lines(self, service, db, bank_company):
        contacts = self._build_contacts(db, bank_company)
        dossier = service.generate_stakeholder_opportunity_dossier(
            company_name=bank_company.name,
            pillar_key="network",
            solution_title="SD-WAN Solution",
            contacts=contacts,
        )
        for line in dossier.splitlines():
            stripped = line.strip()
            assert stripped != "-", f"Found empty bullet line: '{line}'"


# ===========================================================================
# Section 3 - Service: create_opportunity_from_stakeholders
# ===========================================================================

class TestCreateOpportunityFromStakeholders:
    """Service-level tests for create_opportunity_from_stakeholders."""

    def _make_req(self, **kwargs) -> ConvertStakeholdersToOpportunityRequest:
        defaults = {
            "company_id": None,
            "company_name": None,
            "contact_ids": [],
            "candidate_contacts": None,
            "primary_contact_id": None,
            "pillar": None,
            "solution_title": None,
            "custom_title": None,
            "pain_points": None,
            "estimated_value": 0.0,
            "notes": None,
        }
        defaults.update(kwargs)
        return ConvertStakeholdersToOpportunityRequest(**defaults)

    # --- Company resolution ---

    def test_existing_company_by_id_is_reused(
        self, service, db, bank_company, security_contact, lgo_user
    ):
        req = self._make_req(
            company_id=str(bank_company.id),
            contact_ids=[str(security_contact.id)],
        )
        result = service.create_opportunity_from_stakeholders(db, req, lgo_user)
        assert result.company_id == str(bank_company.id)
        # Only one company should exist
        company_count = db.query(Company).filter(Company.id == bank_company.id).count()
        assert company_count == 1

    def test_existing_company_by_name_is_reused(
        self, service, db, bank_company, security_contact, lgo_user
    ):
        req = self._make_req(
            company_name="PT Bank Mandiri Tbk",
            contact_ids=[str(security_contact.id)],
        )
        result = service.create_opportunity_from_stakeholders(db, req, lgo_user)
        assert result.company_id == str(bank_company.id)

    def test_new_company_auto_created_when_not_found(self, service, db, lgo_user):
        req = self._make_req(
            company_name="PT Baru Nusantara",
            candidate_contacts=[
                StakeholderOpportunityContactInput(
                    name="Ahmad Fauzi",
                    job_title="Head of IT",
                )
            ],
        )
        result = service.create_opportunity_from_stakeholders(db, req, lgo_user)
        new_company = db.query(Company).filter(Company.name == "PT Baru Nusantara").first()
        assert new_company is not None
        assert result.company_id == str(new_company.id)

    def test_invalid_company_id_raises_400(self, service, db, lgo_user):
        from fastapi import HTTPException
        req = self._make_req(
            company_id="not-a-valid-uuid",
            candidate_contacts=[
                StakeholderOpportunityContactInput(name="Test User", job_title="Staff")
            ],
        )
        with pytest.raises(HTTPException) as exc_info:
            service.create_opportunity_from_stakeholders(db, req, lgo_user)
        assert exc_info.value.status_code == 400
        assert "tidak valid" in exc_info.value.detail

    def test_nonexistent_company_id_raises_404(self, service, db, lgo_user):
        from fastapi import HTTPException
        req = self._make_req(
            company_id=str(uuid.uuid4()),
            candidate_contacts=[
                StakeholderOpportunityContactInput(name="Test User", job_title="Staff")
            ],
        )
        with pytest.raises(HTTPException) as exc_info:
            service.create_opportunity_from_stakeholders(db, req, lgo_user)
        assert exc_info.value.status_code == 404

    def test_missing_company_id_and_name_raises_400(self, service, db, lgo_user):
        from fastapi import HTTPException
        req = self._make_req(
            company_id=None,
            company_name=None,
            candidate_contacts=[
                StakeholderOpportunityContactInput(name="Test", job_title="IT")
            ],
        )
        with pytest.raises(HTTPException) as exc_info:
            service.create_opportunity_from_stakeholders(db, req, lgo_user)
        assert exc_info.value.status_code == 400

    # --- Contact resolution ---

    def test_no_contacts_raises_400(self, service, db, bank_company, lgo_user):
        from fastapi import HTTPException
        req = self._make_req(
            company_id=str(bank_company.id),
            contact_ids=[],
            candidate_contacts=None,
        )
        with pytest.raises(HTTPException) as exc_info:
            service.create_opportunity_from_stakeholders(db, req, lgo_user)
        assert exc_info.value.status_code == 400
        assert "kontak" in exc_info.value.detail.lower()

    def test_contact_ids_from_directory_resolved(
        self, service, db, bank_company, security_contact, lgo_user
    ):
        req = self._make_req(
            company_id=str(bank_company.id),
            contact_ids=[str(security_contact.id)],
        )
        result = service.create_opportunity_from_stakeholders(db, req, lgo_user)
        assert result.contacts_count == 1

    def test_invalid_uuid_in_contact_ids_is_silently_skipped(
        self, service, db, bank_company, security_contact, lgo_user
    ):
        """An invalid UUID in contact_ids should be skipped, not crash."""
        req = self._make_req(
            company_id=str(bank_company.id),
            contact_ids=["not-a-uuid", str(security_contact.id)],
        )
        result = service.create_opportunity_from_stakeholders(db, req, lgo_user)
        # The valid contact should still be resolved
        assert result.contacts_count == 1

    def test_multi_stakeholder_all_resolved(
        self, service, db, bank_company, security_contact, network_contact, lgo_user
    ):
        req = self._make_req(
            company_id=str(bank_company.id),
            contact_ids=[str(security_contact.id), str(network_contact.id)],
        )
        result = service.create_opportunity_from_stakeholders(db, req, lgo_user)
        assert result.contacts_count == 2

    # --- Primary contact resolution ---

    def test_explicit_primary_contact_id_is_used(
        self, service, db, bank_company, security_contact, network_contact, lgo_user
    ):
        req = self._make_req(
            company_id=str(bank_company.id),
            contact_ids=[str(security_contact.id), str(network_contact.id)],
            primary_contact_id=str(network_contact.id),
        )
        result = service.create_opportunity_from_stakeholders(db, req, lgo_user)
        assert result.primary_contact_id == str(network_contact.id)

    def test_is_primary_flag_used_when_no_explicit_primary(
        self, service, db, bank_company, security_contact, network_contact, lgo_user
    ):
        # security_contact has is_primary=True, network_contact has is_primary=False
        req = self._make_req(
            company_id=str(bank_company.id),
            contact_ids=[str(network_contact.id), str(security_contact.id)],
            primary_contact_id=None,
        )
        result = service.create_opportunity_from_stakeholders(db, req, lgo_user)
        assert result.primary_contact_id == str(security_contact.id)

    def test_first_contact_used_as_primary_when_no_flag_set(
        self, service, db, bank_company, lgo_user
    ):
        """When no primary flag and no explicit id, first resolved contact is primary."""
        c1 = CompanyContact(
            id=uuid.uuid4(), company_id=bank_company.id,
            name="First Person", job_title="Manager", is_primary=False,
        )
        c2 = CompanyContact(
            id=uuid.uuid4(), company_id=bank_company.id,
            name="Second Person", job_title="Staff", is_primary=False,
        )
        db.add_all([c1, c2])
        db.commit()

        req = self._make_req(
            company_id=str(bank_company.id),
            contact_ids=[str(c1.id), str(c2.id)],
            primary_contact_id=None,
        )
        result = service.create_opportunity_from_stakeholders(db, req, lgo_user)
        assert result.primary_contact_id == str(c1.id)

    def test_single_stakeholder_scenario(
        self, service, db, bank_company, security_contact, lgo_user
    ):
        req = self._make_req(
            company_id=str(bank_company.id),
            contact_ids=[str(security_contact.id)],
        )
        result = service.create_opportunity_from_stakeholders(db, req, lgo_user)
        assert result.contacts_count == 1
        assert result.primary_contact_id == str(security_contact.id)

    # --- Pillar & solution matching ---

    def test_explicit_pillar_overrides_auto_detection(
        self, service, db, bank_company, security_contact, lgo_user
    ):
        req = self._make_req(
            company_id=str(bank_company.id),
            contact_ids=[str(security_contact.id)],
            pillar="data",  # Force data even though contact is CISO
        )
        result = service.create_opportunity_from_stakeholders(db, req, lgo_user)
        assert result.pillar == PILLAR_INTELLIGENCE["data"]["pillar"]

    def test_auto_pillar_from_ciso_title(
        self, service, db, bank_company, security_contact, lgo_user
    ):
        req = self._make_req(
            company_id=str(bank_company.id),
            contact_ids=[str(security_contact.id)],
            pillar=None,
        )
        result = service.create_opportunity_from_stakeholders(db, req, lgo_user)
        assert result.pillar == PILLAR_INTELLIGENCE["security"]["pillar"]

    def test_custom_solution_title_used(
        self, service, db, bank_company, security_contact, lgo_user
    ):
        custom_sol = "Custom Integrated Security Platform"
        req = self._make_req(
            company_id=str(bank_company.id),
            contact_ids=[str(security_contact.id)],
            solution_title=custom_sol,
        )
        result = service.create_opportunity_from_stakeholders(db, req, lgo_user)
        assert result.solution_title == custom_sol

    def test_custom_opportunity_title_used(
        self, service, db, bank_company, security_contact, lgo_user
    ):
        custom_title = "Zero Trust Project Bank Mandiri 2026"
        req = self._make_req(
            company_id=str(bank_company.id),
            contact_ids=[str(security_contact.id)],
            custom_title=custom_title,
        )
        result = service.create_opportunity_from_stakeholders(db, req, lgo_user)
        assert result.opportunity_title == custom_title

    def test_default_opportunity_title_includes_company_and_solution(
        self, service, db, bank_company, security_contact, lgo_user
    ):
        req = self._make_req(
            company_id=str(bank_company.id),
            contact_ids=[str(security_contact.id)],
        )
        result = service.create_opportunity_from_stakeholders(db, req, lgo_user)
        assert bank_company.name in result.opportunity_title

    # --- Opportunity & response fields ---

    def test_opportunity_created_in_db(
        self, service, db, bank_company, security_contact, lgo_user
    ):
        req = self._make_req(
            company_id=str(bank_company.id),
            contact_ids=[str(security_contact.id)],
        )
        result = service.create_opportunity_from_stakeholders(db, req, lgo_user)
        opp = db.query(Opportunity).filter(
            Opportunity.id == uuid.UUID(result.opportunity_id)
        ).first()
        assert opp is not None
        assert opp.company_id == bank_company.id
        assert opp.primary_contact_id == security_contact.id
        assert opp.status == "New"
        assert opp.created_by == lgo_user.id

    def test_opportunity_estimated_value_stored(
        self, service, db, bank_company, security_contact, lgo_user
    ):
        req = self._make_req(
            company_id=str(bank_company.id),
            contact_ids=[str(security_contact.id)],
            estimated_value=500_000_000.0,
        )
        result = service.create_opportunity_from_stakeholders(db, req, lgo_user)
        opp = db.query(Opportunity).filter(
            Opportunity.id == uuid.UUID(result.opportunity_id)
        ).first()
        assert float(opp.potential_revenue) == 500_000_000.0

    def test_opportunity_contacts_json_stored(
        self, service, db, bank_company, security_contact, network_contact, lgo_user
    ):
        req = self._make_req(
            company_id=str(bank_company.id),
            contact_ids=[str(security_contact.id), str(network_contact.id)],
        )
        result = service.create_opportunity_from_stakeholders(db, req, lgo_user)
        opp = db.query(Opportunity).filter(
            Opportunity.id == uuid.UUID(result.opportunity_id)
        ).first()
        assert isinstance(opp.contacts, list)
        assert len(opp.contacts) == 2
        names = [c["name"] for c in opp.contacts]
        assert security_contact.name in names
        assert network_contact.name in names

    def test_redirect_url_contains_opportunity_id(
        self, service, db, bank_company, security_contact, lgo_user
    ):
        req = self._make_req(
            company_id=str(bank_company.id),
            contact_ids=[str(security_contact.id)],
        )
        result = service.create_opportunity_from_stakeholders(db, req, lgo_user)
        assert result.redirect_url == f"/opportunities/{result.opportunity_id}"

    def test_result_status_is_success(
        self, service, db, bank_company, security_contact, lgo_user
    ):
        req = self._make_req(
            company_id=str(bank_company.id),
            contact_ids=[str(security_contact.id)],
        )
        result = service.create_opportunity_from_stakeholders(db, req, lgo_user)
        assert result.status == "success"


# ===========================================================================
# Section 4 - Candidate Contacts Persistence & Deduplication
# ===========================================================================

class TestCandidateContactsPersistenceAndDedup:
    """Tests for candidate_contacts: new contact creation and deduplication logic."""

    def _make_req(self, **kwargs):
        defaults = {
            "company_id": None,
            "company_name": None,
            "contact_ids": [],
            "candidate_contacts": None,
            "primary_contact_id": None,
        }
        defaults.update(kwargs)
        return ConvertStakeholdersToOpportunityRequest(**defaults)

    def test_new_candidate_contact_persisted_to_db(
        self, service, db, bank_company, lgo_user
    ):
        req = self._make_req(
            company_id=str(bank_company.id),
            candidate_contacts=[
                StakeholderOpportunityContactInput(
                    name="Dewi Pratiwi",
                    job_title="Head of Cloud Infrastructure",
                    email="dewi@bankmandiri.co.id",
                    phone="+6281111111111",
                    linkedin_url="https://linkedin.com/in/dewi-pratiwi",
                )
            ],
        )
        result = service.create_opportunity_from_stakeholders(db, req, lgo_user)
        saved = db.query(CompanyContact).filter(
            CompanyContact.email == "dewi@bankmandiri.co.id"
        ).first()
        assert saved is not None
        assert saved.name == "Dewi Pratiwi"
        assert saved.company_id == bank_company.id
        assert saved.notes == "Ditambahkan via Outbound Opportunity Generation"

    def test_candidate_contact_deduplication_by_email(
        self, service, db, bank_company, security_contact, lgo_user
    ):
        """If candidate_contacts email matches existing contact, no new record created."""
        initial_count = db.query(CompanyContact).filter(
            CompanyContact.company_id == bank_company.id
        ).count()

        req = self._make_req(
            company_id=str(bank_company.id),
            candidate_contacts=[
                StakeholderOpportunityContactInput(
                    name="Andi Wijaya",  # same name
                    job_title="CISO",
                    email=security_contact.email,  # same email -> dedup trigger
                )
            ],
        )
        service.create_opportunity_from_stakeholders(db, req, lgo_user)

        final_count = db.query(CompanyContact).filter(
            CompanyContact.company_id == bank_company.id
        ).count()
        # No new contact should have been created
        assert final_count == initial_count

    def test_candidate_contact_deduplication_by_name(
        self, service, db, bank_company, security_contact, lgo_user
    ):
        """If candidate name matches existing contact name, no new record created."""
        initial_count = db.query(CompanyContact).filter(
            CompanyContact.company_id == bank_company.id
        ).count()

        req = self._make_req(
            company_id=str(bank_company.id),
            candidate_contacts=[
                StakeholderOpportunityContactInput(
                    name=security_contact.name,  # same name -> dedup trigger
                    job_title="CISO",
                    email=None,
                )
            ],
        )
        service.create_opportunity_from_stakeholders(db, req, lgo_user)

        final_count = db.query(CompanyContact).filter(
            CompanyContact.company_id == bank_company.id
        ).count()
        assert final_count == initial_count

    def test_candidate_contact_deduplication_by_uuid(
        self, service, db, bank_company, security_contact, lgo_user
    ):
        """If candidate id matches existing contact UUID, it is reused not duplicated."""
        initial_count = db.query(CompanyContact).filter(
            CompanyContact.company_id == bank_company.id
        ).count()

        req = self._make_req(
            company_id=str(bank_company.id),
            candidate_contacts=[
                StakeholderOpportunityContactInput(
                    id=str(security_contact.id),
                    name=security_contact.name,
                    job_title="CISO",
                )
            ],
        )
        service.create_opportunity_from_stakeholders(db, req, lgo_user)

        final_count = db.query(CompanyContact).filter(
            CompanyContact.company_id == bank_company.id
        ).count()
        assert final_count == initial_count

    def test_combined_contact_ids_and_candidate_contacts(
        self, service, db, bank_company, security_contact, lgo_user
    ):
        """contact_ids and candidate_contacts can be combined without duplication."""
        req = self._make_req(
            company_id=str(bank_company.id),
            contact_ids=[str(security_contact.id)],
            candidate_contacts=[
                StakeholderOpportunityContactInput(
                    name="Fajar Nugroho",
                    job_title="Cloud Architect",
                    email="fajar@bankmandiri.co.id",
                )
            ],
        )
        result = service.create_opportunity_from_stakeholders(db, req, lgo_user)
        assert result.contacts_count == 2

    def test_duplicate_contact_ids_not_doubled(
        self, service, db, bank_company, security_contact, lgo_user
    ):
        """Passing the same contact_id twice should not result in double entry."""
        req = self._make_req(
            company_id=str(bank_company.id),
            contact_ids=[str(security_contact.id), str(security_contact.id)],
        )
        result = service.create_opportunity_from_stakeholders(db, req, lgo_user)
        assert result.contacts_count == 1

    def test_candidate_contact_with_invalid_uuid_fallback_to_name_match(
        self, service, db, bank_company, security_contact, lgo_user
    ):
        """If candidate has invalid UUID id, fallback to name match dedup."""
        initial_count = db.query(CompanyContact).filter(
            CompanyContact.company_id == bank_company.id
        ).count()

        req = self._make_req(
            company_id=str(bank_company.id),
            candidate_contacts=[
                StakeholderOpportunityContactInput(
                    id="invalid-uuid-string",
                    name=security_contact.name,
                    job_title="CISO",
                )
            ],
        )
        service.create_opportunity_from_stakeholders(db, req, lgo_user)

        final_count = db.query(CompanyContact).filter(
            CompanyContact.company_id == bank_company.id
        ).count()
        assert final_count == initial_count


# ===========================================================================
# Section 5 - Timeline Event Audit
# ===========================================================================

class TestTimelineEventAudit:
    """Validate TimelineEvent records created after opportunity generation."""

    def _make_req(self, company_id, contact_ids):
        return ConvertStakeholdersToOpportunityRequest(
            company_id=company_id,
            contact_ids=contact_ids,
        )

    def test_timeline_event_created(
        self, service, db, bank_company, security_contact, lgo_user
    ):
        req = self._make_req(str(bank_company.id), [str(security_contact.id)])
        result = service.create_opportunity_from_stakeholders(db, req, lgo_user)

        timeline = db.query(TimelineEvent).filter(
            TimelineEvent.opportunity_id == uuid.UUID(result.opportunity_id)
        ).first()
        assert timeline is not None

    def test_timeline_event_action_is_outbound_opportunity_created(
        self, service, db, bank_company, security_contact, lgo_user
    ):
        req = self._make_req(str(bank_company.id), [str(security_contact.id)])
        result = service.create_opportunity_from_stakeholders(db, req, lgo_user)

        timeline = db.query(TimelineEvent).filter(
            TimelineEvent.opportunity_id == uuid.UUID(result.opportunity_id)
        ).first()
        assert timeline.action == "Outbound Opportunity Created"

    def test_timeline_event_type_is_create(
        self, service, db, bank_company, security_contact, lgo_user
    ):
        req = self._make_req(str(bank_company.id), [str(security_contact.id)])
        result = service.create_opportunity_from_stakeholders(db, req, lgo_user)

        timeline = db.query(TimelineEvent).filter(
            TimelineEvent.opportunity_id == uuid.UUID(result.opportunity_id)
        ).first()
        assert timeline.event_type == "create"

    def test_timeline_event_actor_id_is_current_user(
        self, service, db, bank_company, security_contact, lgo_user
    ):
        req = self._make_req(str(bank_company.id), [str(security_contact.id)])
        result = service.create_opportunity_from_stakeholders(db, req, lgo_user)

        timeline = db.query(TimelineEvent).filter(
            TimelineEvent.opportunity_id == uuid.UUID(result.opportunity_id)
        ).first()
        assert timeline.actor_id == lgo_user.id

    def test_timeline_event_description_mentions_company_and_contact(
        self, service, db, bank_company, security_contact, lgo_user
    ):
        req = self._make_req(str(bank_company.id), [str(security_contact.id)])
        result = service.create_opportunity_from_stakeholders(db, req, lgo_user)

        timeline = db.query(TimelineEvent).filter(
            TimelineEvent.opportunity_id == uuid.UUID(result.opportunity_id)
        ).first()
        assert bank_company.name in timeline.description
        assert security_contact.name in timeline.description

    def test_timeline_event_actor_name_from_user(
        self, service, db, bank_company, security_contact, lgo_user
    ):
        req = self._make_req(str(bank_company.id), [str(security_contact.id)])
        result = service.create_opportunity_from_stakeholders(db, req, lgo_user)

        timeline = db.query(TimelineEvent).filter(
            TimelineEvent.opportunity_id == uuid.UUID(result.opportunity_id)
        ).first()
        assert timeline.actor_name == lgo_user.full_name


# ===========================================================================
# Section 6 - HTTP Endpoint: POST /api/prospecting/convert-to-opportunity
# ===========================================================================

class TestConvertToOpportunityEndpoint:
    """Integration tests for the HTTP endpoint layer."""

    def test_endpoint_single_stakeholder_success(
        self,
        client: TestClient,
        db: Session,
        lgo_auth_headers_prospecting: dict,
        bank_company: Company,
        security_contact: CompanyContact,
    ):
        payload = {
            "company_id": str(bank_company.id),
            "contact_ids": [str(security_contact.id)],
        }
        response = client.post(
            "/api/prospecting/convert-to-opportunity",
            json=payload,
            headers=lgo_auth_headers_prospecting,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "opportunity_id" in data
        assert "company_id" in data
        assert data["contacts_count"] == 1
        assert data["redirect_url"].startswith("/opportunities/")

    def test_endpoint_multi_stakeholder_success(
        self,
        client: TestClient,
        db: Session,
        lgo_auth_headers_prospecting: dict,
        bank_company: Company,
        security_contact: CompanyContact,
        network_contact: CompanyContact,
    ):
        payload = {
            "company_id": str(bank_company.id),
            "contact_ids": [str(security_contact.id), str(network_contact.id)],
            "primary_contact_id": str(security_contact.id),
        }
        response = client.post(
            "/api/prospecting/convert-to-opportunity",
            json=payload,
            headers=lgo_auth_headers_prospecting,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["contacts_count"] == 2
        assert data["primary_contact_id"] == str(security_contact.id)

    def test_endpoint_new_company_auto_created(
        self,
        client: TestClient,
        db: Session,
        lgo_auth_headers_prospecting: dict,
    ):
        payload = {
            "company_name": "PT Cloud Nusantara Baru",
            "industry": "Technology",
            "candidate_contacts": [
                {
                    "name": "Rizki Pratama",
                    "job_title": "Cloud DevOps Engineer",
                    "email": "rizki@cloudnusantara.id",
                }
            ],
        }
        response = client.post(
            "/api/prospecting/convert-to-opportunity",
            json=payload,
            headers=lgo_auth_headers_prospecting,
        )
        assert response.status_code == 200
        data = response.json()
        new_company = db.query(Company).filter(
            Company.name == "PT Cloud Nusantara Baru"
        ).first()
        assert new_company is not None
        assert data["company_id"] == str(new_company.id)

    def test_endpoint_explicit_pillar_returned_in_response(
        self,
        client: TestClient,
        db: Session,
        lgo_auth_headers_prospecting: dict,
        bank_company: Company,
        security_contact: CompanyContact,
    ):
        payload = {
            "company_id": str(bank_company.id),
            "contact_ids": [str(security_contact.id)],
            "pillar": "cloud",
        }
        response = client.post(
            "/api/prospecting/convert-to-opportunity",
            json=payload,
            headers=lgo_auth_headers_prospecting,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["pillar"] == PILLAR_INTELLIGENCE["cloud"]["pillar"]

    def test_endpoint_invalid_company_id_returns_400(
        self,
        client: TestClient,
        lgo_auth_headers_prospecting: dict,
    ):
        payload = {
            "company_id": "totally-not-a-uuid",
            "candidate_contacts": [
                {"name": "Test", "job_title": "IT Staff"}
            ],
        }
        response = client.post(
            "/api/prospecting/convert-to-opportunity",
            json=payload,
            headers=lgo_auth_headers_prospecting,
        )
        assert response.status_code == 400

    def test_endpoint_nonexistent_company_id_returns_404(
        self,
        client: TestClient,
        lgo_auth_headers_prospecting: dict,
    ):
        payload = {
            "company_id": str(uuid.uuid4()),
            "candidate_contacts": [
                {"name": "Test", "job_title": "IT Staff"}
            ],
        }
        response = client.post(
            "/api/prospecting/convert-to-opportunity",
            json=payload,
            headers=lgo_auth_headers_prospecting,
        )
        assert response.status_code == 404

    def test_endpoint_no_contacts_returns_400(
        self,
        client: TestClient,
        lgo_auth_headers_prospecting: dict,
        bank_company: Company,
    ):
        payload = {
            "company_id": str(bank_company.id),
            "contact_ids": [],
            "candidate_contacts": None,
        }
        response = client.post(
            "/api/prospecting/convert-to-opportunity",
            json=payload,
            headers=lgo_auth_headers_prospecting,
        )
        assert response.status_code == 400
        assert "kontak" in response.json()["detail"].lower()

    def test_endpoint_unauthorized_role_returns_403(
        self,
        client: TestClient,
        auth_headers: dict,  # engineer role without prospecting capability
        bank_company: Company,
        security_contact: CompanyContact,
    ):
        payload = {
            "company_id": str(bank_company.id),
            "contact_ids": [str(security_contact.id)],
        }
        response = client.post(
            "/api/prospecting/convert-to-opportunity",
            json=payload,
            headers=auth_headers,
        )
        assert response.status_code == 403
        assert "Akses fitur Lusha Prospecting terbatas" in response.json()["detail"]

    def test_endpoint_candidate_contacts_persisted(
        self,
        client: TestClient,
        db: Session,
        lgo_auth_headers_prospecting: dict,
        bank_company: Company,
    ):
        email = f"candidate_{uuid.uuid4().hex[:8]}@test.co.id"
        payload = {
            "company_id": str(bank_company.id),
            "candidate_contacts": [
                {
                    "name": "New Candidate",
                    "job_title": "Network Architect",
                    "email": email,
                }
            ],
        }
        response = client.post(
            "/api/prospecting/convert-to-opportunity",
            json=payload,
            headers=lgo_auth_headers_prospecting,
        )
        assert response.status_code == 200
        saved = db.query(CompanyContact).filter(
            CompanyContact.email == email
        ).first()
        assert saved is not None
        assert saved.company_id == bank_company.id

    def test_endpoint_timeline_event_in_db(
        self,
        client: TestClient,
        db: Session,
        lgo_auth_headers_prospecting: dict,
        bank_company: Company,
        security_contact: CompanyContact,
    ):
        payload = {
            "company_id": str(bank_company.id),
            "contact_ids": [str(security_contact.id)],
        }
        response = client.post(
            "/api/prospecting/convert-to-opportunity",
            json=payload,
            headers=lgo_auth_headers_prospecting,
        )
        assert response.status_code == 200
        opp_id = uuid.UUID(response.json()["opportunity_id"])
        timeline = db.query(TimelineEvent).filter(
            TimelineEvent.opportunity_id == opp_id
        ).first()
        assert timeline is not None
        assert timeline.action == "Outbound Opportunity Created"
        assert timeline.event_type == "create"

    def test_endpoint_dossier_no_latex_in_customer_needs(
        self,
        client: TestClient,
        db: Session,
        lgo_auth_headers_prospecting: dict,
        bank_company: Company,
        security_contact: CompanyContact,
    ):
        payload = {
            "company_id": str(bank_company.id),
            "contact_ids": [str(security_contact.id)],
        }
        response = client.post(
            "/api/prospecting/convert-to-opportunity",
            json=payload,
            headers=lgo_auth_headers_prospecting,
        )
        assert response.status_code == 200
        opp_id = uuid.UUID(response.json()["opportunity_id"])
        opp = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
        assert "$" not in opp.customer_needs
        assert "\\rightarrow" not in opp.customer_needs

    def test_endpoint_custom_title_and_pain_points(
        self,
        client: TestClient,
        db: Session,
        lgo_auth_headers_prospecting: dict,
        bank_company: Company,
        security_contact: CompanyContact,
    ):
        payload = {
            "company_id": str(bank_company.id),
            "contact_ids": [str(security_contact.id)],
            "custom_title": "Proyek Zero Trust Bank Mandiri 2026",
            "pain_points": ["Custom pain point X", "Custom pain point Y"],
        }
        response = client.post(
            "/api/prospecting/convert-to-opportunity",
            json=payload,
            headers=lgo_auth_headers_prospecting,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["opportunity_title"] == "Proyek Zero Trust Bank Mandiri 2026"

        opp_id = uuid.UUID(data["opportunity_id"])
        opp = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
        assert "Custom pain point X" in opp.customer_needs
        assert "Custom pain point Y" in opp.customer_needs

    def test_endpoint_estimated_value_persisted(
        self,
        client: TestClient,
        db: Session,
        lgo_auth_headers_prospecting: dict,
        bank_company: Company,
        security_contact: CompanyContact,
    ):
        payload = {
            "company_id": str(bank_company.id),
            "contact_ids": [str(security_contact.id)],
            "estimated_value": 1_200_000_000.0,
        }
        response = client.post(
            "/api/prospecting/convert-to-opportunity",
            json=payload,
            headers=lgo_auth_headers_prospecting,
        )
        assert response.status_code == 200
        opp_id = uuid.UUID(response.json()["opportunity_id"])
        opp = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
        assert float(opp.potential_revenue) == 1_200_000_000.0

    def test_endpoint_missing_both_company_id_and_name_returns_400(
        self,
        client: TestClient,
        lgo_auth_headers_prospecting: dict,
    ):
        payload = {
            "candidate_contacts": [
                {"name": "Dummy", "job_title": "IT"}
            ]
        }
        response = client.post(
            "/api/prospecting/convert-to-opportunity",
            json=payload,
            headers=lgo_auth_headers_prospecting,
        )
        assert response.status_code == 400

    def test_endpoint_all_four_pillar_keywords_trigger_correct_pillar(
        self,
        client: TestClient,
        db: Session,
        lgo_auth_headers_prospecting: dict,
        bank_company: Company,
    ):
        """Each pillar's expected keyword in job title should yield correct pillar."""
        test_cases = [
            ("CISO - Information Security", "security", "security"),
            ("Data Engineer - BigQuery Platform", "data", "data"),
            ("Cloud Infrastructure Architect", "cloud", "cloud"),
            ("Head of Network Operations - Cisco SD-WAN", "network", "network"),
        ]

        for job_title, expected_pillar_key, _ in test_cases:
            contact = CompanyContact(
                id=uuid.uuid4(),
                company_id=bank_company.id,
                name=f"Test Contact {uuid.uuid4().hex[:4]}",
                job_title=job_title,
            )
            db.add(contact)
            db.commit()
            db.refresh(contact)

            payload = {
                "company_id": str(bank_company.id),
                "contact_ids": [str(contact.id)],
            }
            response = client.post(
                "/api/prospecting/convert-to-opportunity",
                json=payload,
                headers=lgo_auth_headers_prospecting,
            )
            assert response.status_code == 200, f"Failed for job_title: {job_title}"
            data = response.json()
            expected_pillar_name = PILLAR_INTELLIGENCE[expected_pillar_key]["pillar"]
            assert data["pillar"] == expected_pillar_name, (
                f"Expected pillar '{expected_pillar_name}' for title '{job_title}', "
                f"got '{data['pillar']}'"
            )
