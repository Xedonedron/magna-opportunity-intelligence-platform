"""Tests for notification endpoints."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal
from app.models.user import User
from app.models.notification import Notification
from app.services.auth import create_access_token
import uuid

client = TestClient(app)


@pytest.fixture
def test_user():
    """Create a test user."""
    db = SessionLocal()
    user = User(
        id=uuid.uuid4(),
        email="test_notif@example.com",
        full_name="Test User",
        role="engineer",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    yield user
    # Cleanup
    db.query(Notification).filter(Notification.user_id == user.id).delete()
    db.query(User).filter(User.id == user.id).delete()
    db.commit()
    db.close()


@pytest.fixture
def auth_header(test_user):
    """Create authorization header."""
    token = create_access_token(data={"sub": str(test_user.id), "email": test_user.email})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_notification(test_user):
    """Create a test notification."""
    db = SessionLocal()
    notification = Notification(
        id=uuid.uuid4(),
        user_id=test_user.id,
        type="opportunity_created",
        title="Test Notification",
        message="This is a test notification",
        is_read=False,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    yield notification
    # Cleanup handled by test_user fixture
    db.close()


class TestNotificationList:
    """Tests for GET /api/notifications."""

    def test_list_notifications_success(self, auth_header, test_notification):
        """Test listing notifications."""
        response = client.get("/api/notifications", headers=auth_header)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] >= 1

    def test_list_notifications_unauthorized(self):
        """Test listing notifications without auth."""
        response = client.get("/api/notifications")
        assert response.status_code == 401

    def test_list_notifications_unread_only(self, auth_header, test_notification):
        """Test listing unread notifications only."""
        response = client.get("/api/notifications?unread_only=true", headers=auth_header)
        assert response.status_code == 200
        data = response.json()
        assert all(not item["is_read"] for item in data["items"])


class TestUnreadCount:
    """Tests for GET /api/notifications/unread-count."""

    def test_unread_count_success(self, auth_header, test_notification):
        """Test getting unread count."""
        response = client.get("/api/notifications/unread-count", headers=auth_header)
        assert response.status_code == 200
        data = response.json()
        assert "unread_count" in data
        assert data["unread_count"] >= 1

    def test_unread_count_unauthorized(self):
        """Test getting unread count without auth."""
        response = client.get("/api/notifications/unread-count")
        assert response.status_code == 401


class TestMarkNotificationRead:
    """Tests for PATCH /api/notifications/{notification_id}."""

    def test_mark_notification_read(self, auth_header, test_notification):
        """Test marking notification as read."""
        response = client.patch(
            f"/api/notifications/{test_notification.id}",
            json={"is_read": True},
            headers=auth_header,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_read"] is True

    def test_mark_notification_not_found(self, auth_header):
        """Test marking non-existent notification."""
        fake_id = str(uuid.uuid4())
        response = client.patch(
            f"/api/notifications/{fake_id}",
            json={"is_read": True},
            headers=auth_header,
        )
        assert response.status_code == 404


class TestMarkAllRead:
    """Tests for POST /api/notifications/mark-all-read."""

    def test_mark_all_read_success(self, auth_header, test_notification):
        """Test marking all notifications as read."""
        response = client.post("/api/notifications/mark-all-read", headers=auth_header)
        assert response.status_code == 200
        # Verify all are read
        response2 = client.get("/api/notifications/unread-count", headers=auth_header)
        assert response2.json()["unread_count"] == 0