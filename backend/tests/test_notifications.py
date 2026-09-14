"""Tests for notification endpoints and NotificationService."""

import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.opportunity import Opportunity
from app.models.notification import Notification
from app.services.notification_service import NotificationService


@pytest.fixture
def test_notification(db: Session, test_user: User) -> Notification:
    """Create a test notification in the test SQLite db."""
    notification = Notification(
        id=uuid.uuid4(),
        user_id=test_user.id,
        type="opportunity_created",
        title="Test Notification",
        message="This is a test notification",
        link_url="/opportunities/test-id?tab=overview",
        is_read=False,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


class TestNotificationList:
    """Tests for GET /api/notifications."""

    def test_list_notifications_success(
        self, client: TestClient, auth_headers: dict[str, str], test_notification: Notification
    ):
        """Test listing notifications."""
        response = client.get("/api/notifications", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] >= 1
        assert data["items"][0]["link_url"] is not None

    def test_list_notifications_unauthorized(self, client: TestClient):
        """Test listing notifications without auth."""
        response = client.get("/api/notifications")
        assert response.status_code == 401

    def test_list_notifications_unread_only(
        self, client: TestClient, auth_headers: dict[str, str], test_notification: Notification
    ):
        """Test listing unread notifications only."""
        response = client.get("/api/notifications?unread_only=true", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert all(not item["is_read"] for item in data["items"])


class TestUnreadCount:
    """Tests for GET /api/notifications/unread-count."""

    def test_unread_count_success(
        self, client: TestClient, auth_headers: dict[str, str], test_notification: Notification
    ):
        """Test getting unread count."""
        response = client.get("/api/notifications/unread-count", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "unread_count" in data
        assert data["unread_count"] >= 1

    def test_unread_count_unauthorized(self, client: TestClient):
        """Test getting unread count without auth."""
        response = client.get("/api/notifications/unread-count")
        assert response.status_code == 401


class TestMarkNotificationRead:
    """Tests for PATCH /api/notifications/{notification_id}."""

    def test_mark_notification_read(
        self, client: TestClient, auth_headers: dict[str, str], test_notification: Notification
    ):
        """Test marking notification as read."""
        response = client.patch(
            f"/api/notifications/{test_notification.id}",
            json={"is_read": True},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_read"] is True

    def test_mark_notification_not_found(
        self, client: TestClient, auth_headers: dict[str, str]
    ):
        """Test marking non-existent notification."""
        fake_id = str(uuid.uuid4())
        response = client.patch(
            f"/api/notifications/{fake_id}",
            json={"is_read": True},
            headers=auth_headers,
        )
        assert response.status_code == 404


class TestMarkAllRead:
    """Tests for POST /api/notifications/mark-all-read."""

    def test_mark_all_read_success(
        self, client: TestClient, auth_headers: dict[str, str], test_notification: Notification
    ):
        """Test marking all notifications as read."""
        response = client.post("/api/notifications/mark-all-read", headers=auth_headers)
        assert response.status_code == 200
        # Verify all are read
        response2 = client.get("/api/notifications/unread-count", headers=auth_headers)
        assert response2.json()["unread_count"] == 0


class TestNotificationService:
    """Tests for NotificationService unit functions and routing."""

    def test_resolve_recipients_and_self_exclusion(self, db: Session):
        """Test recipient resolution: creator, assigned engineer, superadmin, and actor exclusion."""
        creator = User(
            id=uuid.uuid4(),
            email="creator@smartnet.co.id",
            full_name="Creator User",
            role="lgo",
            is_active=True,
        )
        engineer = User(
            id=uuid.uuid4(),
            email="presales@smartnet.co.id",
            full_name="Budi Presales",
            role="engineer",
            is_active=True,
        )
        superadmin = User(
            id=uuid.uuid4(),
            email="boss@smartnet.co.id",
            full_name="Super Boss",
            role="superadmin",
            is_active=True,
        )
        other_user = User(
            id=uuid.uuid4(),
            email="other@smartnet.co.id",
            full_name="Other Person",
            role="viewer",
            is_active=True,
        )

        db.add_all([creator, engineer, superadmin, other_user])
        db.commit()

        opp = Opportunity(
            id=uuid.uuid4(),
            company_name="PT Mega Perkasa",
            customer_needs="Cloud Migration",
            created_by=creator.id,
            assigned_engineer="Budi Presales",
            status="New",
        )
        db.add(opp)
        db.commit()

        # 1. Resolve recipients without actor exclusion
        recipients = NotificationService.resolve_recipients(db, opp, actor_id=None)
        recipient_ids = {r.id for r in recipients}
        assert creator.id in recipient_ids
        assert engineer.id in recipient_ids
        assert superadmin.id in recipient_ids
        assert other_user.id not in recipient_ids

        # 2. Resolve with creator as actor -> creator should be excluded (self-actor exclusion)
        recipients_actor_creator = NotificationService.resolve_recipients(
            db, opp, actor_id=creator.id
        )
        actor_ids = {r.id for r in recipients_actor_creator}
        assert creator.id not in actor_ids
        assert engineer.id in actor_ids
        assert superadmin.id in actor_ids

        # 3. Test KYC complete dispatch
        notifs_kyc = NotificationService.notify_kyc_completed(
            db, opp, version=2, actor_id=creator.id
        )
        assert len(notifs_kyc) >= 2
        assert all(n.type == "kyc_completed" for n in notifs_kyc)
        assert all("?tab=kyc" in n.link_url for n in notifs_kyc)
        assert all(n.user_id != creator.id for n in notifs_kyc)

        # 4. Test KYC failed dispatch
        notifs_fail = NotificationService.notify_kyc_failed(
            db, opp, error_message="LLM Timeout", version=2
        )
        assert any(n.type == "kyc_failed" for n in notifs_fail)
        assert any("LLM Timeout" in n.message for n in notifs_fail)

        # 5. Test Revenue change dispatch
        notifs_rev = NotificationService.notify_revenue_changed(
            db, opp, old_val=100000000, new_val=250000000, actor_id=creator.id
        )
        assert any(n.type == "deal_value_changed" for n in notifs_rev)
        assert any("Rp 250.000.000" in n.message for n in notifs_rev)

        # 6. Test Engineer assigned dispatch
        notifs_eng = NotificationService.notify_engineer_assigned(
            db, opp, assigned_engineer="Budi Presales", actor_id=creator.id
        )
        assert any(n.type == "opportunity_assigned" for n in notifs_eng)

        # 7. Test Meeting scheduled dispatch
        notifs_meet = NotificationService.notify_meeting_scheduled(
            db, opp, meeting_title="Discovery Call", meeting_date_str="Sep 20, 2026 10:00 AM", actor_id=creator.id
        )
        assert any(n.type == "meeting_scheduled" for n in notifs_meet)
        assert all("?tab=meetings" in n.link_url for n in notifs_meet)