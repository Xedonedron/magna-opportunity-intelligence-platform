"""
Tests for Master Data Management API and persistence in PostgreSQL system_settings.
"""
import json
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.system_setting import SystemSetting
from app.api.admin import MASTER_DATA


def test_get_master_data_returns_default_7_presales(client: TestClient, auth_headers: dict, db: Session):
    """Test that GET /api/admin/master-data returns all 7 baseline presales and seeds them to DB."""
    response = client.get("/api/admin/master-data", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    expected_presales = [
        "Devi", "Bayu", "Gerry", "Farhan", "Atthur", "Rian", "Syamsul"
    ]
    for member in expected_presales:
        assert member in data["presales"]
    assert len(data["industries"]) >= 20

    # Verify that it was auto-seeded in database
    row = db.query(SystemSetting).filter(SystemSetting.key == "master_data_presales").first()
    assert row is not None
    db_presales = json.loads(row.value)
    assert "Farhan" in db_presales
    assert "Syamsul" in db_presales


def test_update_master_data_persists_to_database(client: TestClient, admin_auth_headers: dict, db: Session):
    """Test that POST /api/admin/master-data updates and persists new presales names to system_settings."""
    new_presales = [
        "Devi", "Bayu", "Gerry", "Farhan", "Atthur", "Rian", "Syamsul",
        "Nixon", "Budi"
    ]
    payload = {
        "industries": ["Finance & Banking", "Energy & Utilities", "Custom Industry"],
        "presales": new_presales,
        "document_labels": ["MoM", "Compro", "Custom Label"],
    }

    response = client.post("/api/admin/master-data", json=payload, headers=admin_auth_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    # Verify DB persistence
    row_presales = db.query(SystemSetting).filter(SystemSetting.key == "master_data_presales").first()
    assert row_presales is not None
    saved_presales = json.loads(row_presales.value)
    assert "Nixon" in saved_presales
    assert "Budi" in saved_presales

    row_ind = db.query(SystemSetting).filter(SystemSetting.key == "master_data_industries").first()
    assert row_ind is not None
    assert "Custom Industry" in json.loads(row_ind.value)

    # Clear in-memory cache to simulate container restart
    MASTER_DATA["presales"] = []
    MASTER_DATA["industries"] = []

    # GET should fetch from DB, not default to 3 names
    get_res = client.get("/api/admin/master-data", headers=admin_auth_headers)
    assert get_res.status_code == 200
    fetched = get_res.json()
    assert "Nixon" in fetched["presales"]
    assert "Budi" in fetched["presales"]
    assert "Custom Industry" in fetched["industries"]


def test_update_master_data_forbidden_for_regular_user(client: TestClient, auth_headers: dict):
    """Test that regular engineer user cannot update master data."""
    payload = {
        "industries": ["Finance & Banking"],
        "presales": ["Devi"],
    }
    response = client.post("/api/admin/master-data", json=payload, headers=auth_headers)
    assert response.status_code == 403
