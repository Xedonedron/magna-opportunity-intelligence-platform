"""
Tests for Target Persona endpoints and generation logic.
"""

from unittest.mock import patch
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
        """Should return empty list if no personas generated yet."""
        response = client.get(
            f"/api/opportunities/{test_opportunity.id}/personas", headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json() == []

    @patch("app.services.persona_service.generate_persona_questions_with_llm")
    def test_get_persona_auto_generates_and_saves(
        self,
        mock_llm,
        client: TestClient,
        auth_headers: dict[str, str],
        db: Session,
        test_opportunity: Opportunity,
    ):
        """Should generate and save to database on first GET request."""
        mock_llm.return_value = {
            "key_responsibilities": "Oversee operations",
            "strategic_focus": "Process automation & efficiency",
            "pain_points": ["Legacy systems", "Manual bottlenecks"],
            "discovery_questions": ["How do you track SLAs?"],
            "objection_handling": ["If concern is downtime: highlight phased rollout."],
        }

        response = client.get(
            f"/api/opportunities/{test_opportunity.id}/personas/Director/Operations",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["seniority"] == "Director"
        assert data["department"] == "Operations"
        assert len(data["discovery_questions"]) == 1
        assert data["discovery_questions"][0] == "How do you track SLAs?"

        # Verify cached in database
        saved = (
            db.query(OpportunityPersona)
            .filter_by(
                opportunity_id=test_opportunity.id,
                seniority="Director",
                department="Operations",
            )
            .first()
        )
        assert saved is not None
        assert saved.strategic_focus == "Process automation & efficiency"

    @patch("app.services.persona_service.generate_persona_questions_with_llm")
    def test_get_persona_returns_cached_without_calling_llm(
        self,
        mock_llm,
        client: TestClient,
        auth_headers: dict[str, str],
        db: Session,
        test_opportunity: Opportunity,
    ):
        """Should return cached persona if already exists without re-calling LLM."""
        cached_persona = OpportunityPersona(
            id=uuid.uuid4(),
            opportunity_id=test_opportunity.id,
            seniority="VP",
            department="IT",
            key_responsibilities="IT Infrastructure",
            strategic_focus="Cloud security",
            pain_points=["Cloud migration risks"],
            discovery_questions=["What is your current RPO/RTO?"],
            objection_handling=["Highlight SOC 2 compliance."],
        )
        db.add(cached_persona)
        db.commit()

        response = client.get(
            f"/api/opportunities/{test_opportunity.id}/personas/VP/IT",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["seniority"] == "VP"
        assert data["discovery_questions"] == ["What is your current RPO/RTO?"]
        mock_llm.assert_not_called()