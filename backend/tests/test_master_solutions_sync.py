"""
Tests for Master Solutions model, schemas, and sync from curated_solutions_isti.json.
"""
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.master_solution import MasterSolution
from app.schemas.master_solution import (
    MasterSolutionBase,
    MasterSolutionCreate,
    MasterSolutionUpdate,
    MasterSolutionResponse,
)


def test_master_solution_model_presales_fields(db: Session):
    """Test creating MasterSolution model with 5 presales metadata fields."""
    sol = MasterSolution(
        title="Test PAM Solution",
        slug="test-pam-solution",
        pillar="Cybersecurity Suite",
        tier=1,
        primary_products=["BeyondTrust"],
        all_products=["BeyondTrust", "CyberArk"],
        target_industries=["Banking", "Enterprise General"],
        solution_domain="privileged_access_management",
        regulatory_compliance=["ojk", "bi", "iso27001"],
        target_environment="hybrid",
        probing_questions=["Bagaimana pengelolaan password superuser saat ini?"],
        battlecard_ammo={
            "key_differentiators": "Session recording otomatis",
            "objection_handling": "Mudah diintegrasikan dengan MFA",
            "market_stats": "80% breach melibatkan admin credentials",
        },
    )
    db.add(sol)
    db.commit()
    db.refresh(sol)

    assert sol.solution_domain == "privileged_access_management"
    assert "ojk" in sol.regulatory_compliance
    assert sol.target_environment == "hybrid"
    assert len(sol.probing_questions) == 1
    assert sol.battlecard_ammo["key_differentiators"] == "Session recording otomatis"

    d = sol.to_dict()
    assert d["solution_domain"] == "privileged_access_management"
    assert "ojk" in d["regulatory_compliance"]
    assert d["target_environment"] == "hybrid"
    assert d["probing_questions"][0] == "Bagaimana pengelolaan password superuser saat ini?"
    assert d["battlecard_ammo"]["market_stats"] == "80% breach melibatkan admin credentials"


def test_pydantic_schema_presales_metadata():
    """Test MasterSolutionBase and MasterSolutionUpdate Pydantic models."""
    create_data = MasterSolutionCreate(
        title="Endpoint EDR Solution",
        pillar="Cybersecurity Suite",
        solution_domain="endpoint_security",
        regulatory_compliance=["ojk", "uu_pdp"],
        target_environment="cloud",
        probing_questions=["Berapa banyak workstation yang dimonitor?"],
        battlecard_ammo={"key_differentiators": "AI behavioral NGAV"},
    )
    assert create_data.solution_domain == "endpoint_security"
    assert "uu_pdp" in create_data.regulatory_compliance
    assert create_data.target_environment == "cloud"

    update_data = MasterSolutionUpdate(
        target_environment="hybrid",
        regulatory_compliance=["pci_dss"],
    )
    update_dict = update_data.dict(exclude_unset=True)
    assert update_dict["target_environment"] == "hybrid"
    assert update_dict["regulatory_compliance"] == ["pci_dss"]
    assert "solution_domain" not in update_dict


def test_sync_master_solutions_catalog(client: TestClient, admin_auth_headers: dict, db: Session):
    """Test POST /api/admin/solutions/sync populates master solutions catalog with presales metadata."""
    res = client.post("/api/admin/solutions/sync", headers=admin_auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["total_active"] >= 26

    # Verify that PAM solution was seeded with presales metadata
    pam = db.query(MasterSolution).filter(MasterSolution.slug == "privileged-access-management-pam").first()
    assert pam is not None
    assert pam.solution_domain == "privileged_access_management"
    assert "ojk" in pam.regulatory_compliance
    assert pam.target_environment == "hybrid"
    assert len(pam.probing_questions) >= 1
    assert "key_differentiators" in pam.battlecard_ammo
