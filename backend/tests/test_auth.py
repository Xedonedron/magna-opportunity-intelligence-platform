"""
Tests for Authentication API endpoints.
"""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import User


class TestAuthMe:
    """Tests for /api/auth/me endpoint."""

    def test_me_unauthenticated(self, client: TestClient):
        """Should return 401 without auth token."""
        response = client.get("/api/auth/me")
        assert response.status_code == 401

    def test_me_success(self, client: TestClient, auth_headers: dict[str, str], test_user: User):
        """Should return current user profile."""
        response = client.get("/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user.email
        assert data["full_name"] == test_user.full_name
        assert data["role"] == test_user.role

    def test_me_invalid_token(self, client: TestClient):
        """Should return 401 for invalid token."""
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code == 401

    def test_me_expired_token(self, client: TestClient):
        """Should return 401 for expired token."""
        # This would require mocking time or creating an expired token
        # For now, we test with a malformed token
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxNjAwMDAwMDAwfQ.invalid"}
        )
        assert response.status_code == 401


class TestUsernameLogin:
    """Tests for /api/auth/login endpoint."""

    def test_login_admin_success(self, client: TestClient):
        """Should return token for valid admin credentials."""
        response = client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "P@ssw0rd"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == "admin@magnaglobal.id"

    def test_login_engineer_success(self, client: TestClient):
        """Should return token for valid engineer credentials."""
        response = client.post(
            "/api/auth/login",
            json={"username": "engineer", "password": "123456"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "engineer"

    def test_login_invalid_password(self, client: TestClient):
        """Should return 401 for wrong password."""
        response = client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "wrongpassword"}
        )
        assert response.status_code == 401

    def test_login_invalid_username(self, client: TestClient):
        """Should return 401 for unknown username."""
        response = client.post(
            "/api/auth/login",
            json={"username": "nonexistent", "password": "123456"}
        )
        assert response.status_code == 401

    def test_login_missing_fields(self, client: TestClient):
        """Should return 422 for missing fields."""
        response = client.post("/api/auth/login", json={})
        assert response.status_code == 422


class TestGoogleLogin:
    """Tests for /api/auth/google endpoint."""

    def test_google_login_invalid_token(self, client: TestClient):
        """Should return 401 for invalid Google token."""
        response = client.post(
            "/api/auth/google",
            json={"credential": "invalid_google_token"}
        )
        assert response.status_code == 401

    def test_google_login_missing_credential(self, client: TestClient):
        """Should return 422 for missing credential."""
        response = client.post("/api/auth/google", json={})
        assert response.status_code == 422
