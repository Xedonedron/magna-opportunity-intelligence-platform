"""
Tests for Target Persona endpoints and generation logic.
"""

from unittest.mock import AsyncMock, patch
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Opportunity, OpportunityPersona


class TestTargetPersona:
    """Tests for Target Persona API."""

    def test_list_personas_unauthenticated(self, client: TestClient, test_opportunity: Opportunity):
        """Should return 401 without auth token."""
        response = client.get(f"/api/opportunities/{test_opportunity.id}/personas")
        assert response.status_code == 401

    def test_list_personas_empty(
        self, client: TestClient, auth_headers: dict[str, str], test_opportunity: Opportunity
    ):
        """Should return empty items list if no personas generated yet."""
        response = client.get(
            f"/api/opportunities/{test_opportunity.id}/personas", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

    @patch("app.api.personas.generate_persona_playbook", new_callable=AsyncMock)
    def test_generate_persona_success(
        self,
        mock_generate,
        client: TestClient,
        auth_headers: dict[str, str],
        db: Session,
        test_opportunity: Opportunity,
    ):
        """Should generate and save persona to database via POST /generate."""
        mock_generate.return_value = {
            "focus_areas": [{"title": "Cloud Migration", "description": "High priority"}],
            "questions": [{"category": "Architecture", "question": "Current infra setup?", "purpose": "Assess needs"}],
            "value_props": ["Reduce opex by 30%"],
            "objection_handling": [{"objection": "Too expensive", "response": "Phased ROI"}],
        }

        response = client.post(
            f"/api/opportunities/{test_opportunity.id}/personas/generate",
            json={"seniority": "Director/C-Level", "department": "IT", "force_regenerate": False},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["seniority"] == "Director/C-Level"
        assert data["department"] == "IT"
        assert len(data["focus_areas"]) == 1
        assert len(data["questions"]) == 1
        assert data["questions"][0]["question"] == "Current infra setup?"

        # Verify saved in database
        saved = (
            db.query(OpportunityPersona)
            .filter_by(
                opportunity_id=test_opportunity.id,
                seniority="Director/C-Level",
                department="IT",
            )
            .first()
        )
        assert saved is not None
        assert len(saved.focus_areas) == 1

    @patch("app.api.personas.generate_persona_playbook", new_callable=AsyncMock)
    def test_generate_returns_cached_without_calling_llm(
        self,
        mock_generate,
        client: TestClient,
        auth_headers: dict[str, str],
        db: Session,
        test_opportunity: Opportunity,
    ):
        """Should return cached persona if already exists without re-calling generate service."""
        cached_persona = OpportunityPersona(
            id=uuid.uuid4(),
            opportunity_id=test_opportunity.id,
            seniority="VP",
            department="IT",
            focus_areas=[{"title": "Security", "description": "SOC2 Compliance"}],
            questions=[{"category": "Security", "question": "Current RPO?", "purpose": "Baseline"}],
            value_props=["Full coverage"],
            objection_handling=[{"objection": "Time", "response": "Quick onboarding"}],
        )
        db.add(cached_persona)
        db.commit()

        response = client.post(
            f"/api/opportunities/{test_opportunity.id}/personas/generate",
            json={"seniority": "VP", "department": "IT", "force_regenerate": False},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["seniority"] == "VP"
        assert data["questions"][0]["question"] == "Current RPO?"
        mock_generate.assert_not_called()

    def test_get_persona_detail(
        self,
        client: TestClient,
        auth_headers: dict[str, str],
        db: Session,
        test_opportunity: Opportunity,
    ):
        """Should fetch persona detail via GET /detail?seniority=...&department=..."""
        cached = OpportunityPersona(
            id=uuid.uuid4(),
            opportunity_id=test_opportunity.id,
            seniority="Manager",
            department="Finance",
            focus_areas=[{"title": "Cost", "description": "Budget control"}],
            questions=[],
            value_props=[],
            objection_handling=[],
        )
        db.add(cached)
        db.commit()

        response = client.get(
            f"/api/opportunities/{test_opportunity.id}/personas/detail?seniority=Manager&department=Finance",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["seniority"] == "Manager"
        assert data["department"] == "Finance"

    @patch("app.api.personas.generate_persona_playbook", new_callable=AsyncMock)
    def test_generate_persona_custom_others(
        self,
        mock_generate,
        client: TestClient,
        auth_headers: dict[str, str],
        db: Session,
        test_opportunity: Opportunity,
    ):
        """Should support custom seniority and department (Others)."""
        mock_generate.return_value = {
            "focus_areas": [{"title": "Governance & Compliance", "description": "Audit readiness"}],
            "questions": [{"category": "Compliance", "question": "What is current audit cycle?", "purpose": "Gap analysis"}],
            "value_props": ["Automated compliance evidence"],
            "objection_handling": [{"objection": "Audit timing", "response": "Parallel verification"}],
        }

        response = client.post(
            f"/api/opportunities/{test_opportunity.id}/personas/generate",
            json={
                "seniority": "  Lead Enterprise Architect  ",
                "department": "  Risk & Compliance  ",
                "force_regenerate": False,
            },
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["seniority"] == "Lead Enterprise Architect"
        assert data["department"] == "Risk & Compliance"

        # Verify saved in database with trimmed values
        saved = (
            db.query(OpportunityPersona)
            .filter_by(
                opportunity_id=test_opportunity.id,
                seniority="Lead Enterprise Architect",
                department="Risk & Compliance",
            )
            .first()
        )
        assert saved is not None
        assert saved.seniority == "Lead Enterprise Architect"
        assert saved.department == "Risk & Compliance"

    def test_generate_persona_validation_error_empty_or_too_long(
        self,
        client: TestClient,
        auth_headers: dict[str, str],
        test_opportunity: Opportunity,
    ):
        """Should reject whitespace-only or string exceeding 50 chars."""
        # Whitespace-only
        res1 = client.post(
            f"/api/opportunities/{test_opportunity.id}/personas/generate",
            json={"seniority": "   ", "department": "IT"},
            headers=auth_headers,
        )
        assert res1.status_code == 422

        # Too long (>50 chars)
        res2 = client.post(
            f"/api/opportunities/{test_opportunity.id}/personas/generate",
            json={"seniority": "A" * 51, "department": "IT"},
            headers=auth_headers,
        )
        assert res2.status_code == 422
