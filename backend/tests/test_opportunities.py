"""
Tests for Opportunity API endpoints.
"""

import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import User, Opportunity


class TestOpportunityList:
    """Tests for listing opportunities."""

    def test_list_opportunities_unauthenticated(self, client: TestClient):
        """Should return 401 without auth token."""
        response = client.get("/api/opportunities")
        assert response.status_code == 401

    def test_list_opportunities_empty(
        self, client: TestClient, auth_headers: dict[str, str]
    ):
        """Should return empty list when no opportunities exist."""
        response = client.get("/api/opportunities", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["items"] == []

    def test_list_opportunities_with_data(
        self,
        client: TestClient,
        auth_headers: dict[str, str],
        test_opportunity: Opportunity,
    ):
        """Should return list of opportunities."""
        response = client.get("/api/opportunities", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1
        assert data["items"][0]["company_name"] == "Test Company PT"

    def test_list_opportunities_pagination(
        self,
        client: TestClient,
        auth_headers: dict[str, str],
        db: Session,
        test_user: User,
    ):
        """Should handle pagination correctly."""
        # Create 25 opportunities
        for i in range(25):
            opp = Opportunity(
                id=uuid.uuid4(),
                company_name=f"Company {i}",
                customer_needs="Test needs",
                status="New",
                created_by=test_user.id,
            )
            db.add(opp)
        db.commit()

        # Test default pagination
        response = client.get("/api/opportunities", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 25
        assert len(data["items"]) == 20  # default page_size
        assert data["page"] == 1

        # Test second page
        response = client.get("/api/opportunities?page=2", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 5
        assert data["page"] == 2

    def test_list_opportunities_search(
        self,
        client: TestClient,
        auth_headers: dict[str, str],
        db: Session,
        test_user: User,
    ):
        """Should filter by search term."""
        opp1 = Opportunity(
            id=uuid.uuid4(),
            company_name="Acme Corporation",
            customer_needs="Test",
            status="New",
            created_by=test_user.id,
        )
        opp2 = Opportunity(
            id=uuid.uuid4(),
            company_name="Beta Industries",
            customer_needs="Test",
            status="New",
            created_by=test_user.id,
        )
        db.add_all([opp1, opp2])
        db.commit()

        response = client.get(
            "/api/opportunities?search=Acme", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["company_name"] == "Acme Corporation"

    def test_list_opportunities_filter_by_status(
        self,
        client: TestClient,
        auth_headers: dict[str, str],
        db: Session,
        test_user: User,
    ):
        """Should filter by status."""
        opp1 = Opportunity(
            id=uuid.uuid4(),
            company_name="Company A",
            customer_needs="Test",
            status="New",
            created_by=test_user.id,
        )
        opp2 = Opportunity(
            id=uuid.uuid4(),
            company_name="Company B",
            customer_needs="Test",
            status="Won",
            created_by=test_user.id,
        )
        db.add_all([opp1, opp2])
        db.commit()

        response = client.get(
            "/api/opportunities?status=Won", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["status"] == "Won"


class TestOpportunityCreate:
    """Tests for creating opportunities."""

    def test_create_opportunity_unauthenticated(self, client: TestClient):
        """Should return 401 without auth token."""
        response = client.post(
            "/api/opportunities",
            json={
                "company_name": "Test Company",
                "customer_needs": "Test needs",
            },
        )
        assert response.status_code == 401

    def test_create_opportunity_success(
        self, client: TestClient, auth_headers: dict[str, str]
    ):
        """Should create opportunity successfully."""
        response = client.post(
            "/api/opportunities",
            headers=auth_headers,
            json={
                "company_name": "New Test Company",
                "customer_needs": "Need cloud migration",
                "industry": "Technology",
                "website": "https://example.com",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["company_name"] == "New Test Company"
        assert data["status"] == "New"
        assert "id" in data

    def test_create_opportunity_validation_error(
        self, client: TestClient, auth_headers: dict[str, str]
    ):
        """Should return validation error for missing required fields."""
        response = client.post(
            "/api/opportunities",
            headers=auth_headers,
            json={},  # Missing required fields
        )
        assert response.status_code == 422


class TestOpportunityDetail:
    """Tests for opportunity detail endpoint."""

    def test_get_opportunity_not_found(
        self, client: TestClient, auth_headers: dict[str, str]
    ):
        """Should return 404 for non-existent opportunity."""
        fake_id = str(uuid.uuid4())
        response = client.get(f"/api/opportunities/{fake_id}", headers=auth_headers)
        assert response.status_code == 404

    def test_get_opportunity_success(
        self,
        client: TestClient,
        auth_headers: dict[str, str],
        test_opportunity: Opportunity,
    ):
        """Should return opportunity details."""
        response = client.get(
            f"/api/opportunities/{test_opportunity.id}", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_opportunity.id)
        assert data["company_name"] == "Test Company PT"
        assert "timeline_events" in data


class TestOpportunityUpdate:
    """Tests for updating opportunities."""

    def test_update_opportunity_status(
        self,
        client: TestClient,
        auth_headers: dict[str, str],
        test_opportunity: Opportunity,
    ):
        """Should update opportunity status."""
        response = client.patch(
            f"/api/opportunities/{test_opportunity.id}",
            headers=auth_headers,
            json={"status": "KYC Running"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "KYC Running"

    def test_update_opportunity_invalid_status(
        self,
        client: TestClient,
        auth_headers: dict[str, str],
        test_opportunity: Opportunity,
    ):
        """Should reject invalid status."""
        response = client.patch(
            f"/api/opportunities/{test_opportunity.id}",
            headers=auth_headers,
            json={"status": "InvalidStatus"},
        )
        assert response.status_code == 422


class TestOpportunityDelete:
    """Tests for deleting opportunities."""

    def test_delete_opportunity_success(
        self,
        client: TestClient,
        auth_headers: dict[str, str],
        test_opportunity: Opportunity,
    ):
        """Should delete opportunity successfully."""
        response = client.delete(
            f"/api/opportunities/{test_opportunity.id}",
            headers=auth_headers,
        )
        assert response.status_code == 204

        # Verify deletion
        response = client.get(
            f"/api/opportunities/{test_opportunity.id}", headers=auth_headers
        )
        assert response.status_code == 404

    def test_delete_opportunity_not_found(
        self, client: TestClient, auth_headers: dict[str, str]
    ):
        """Should return 404 for non-existent opportunity."""
        fake_id = str(uuid.uuid4())
        response = client.delete(f"/api/opportunities/{fake_id}", headers=auth_headers)
        assert response.status_code == 404