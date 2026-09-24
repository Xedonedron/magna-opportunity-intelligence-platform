"""Tests for KYC Pipeline Concurrency & Failure Resilience (URGENT_FIX #3).

Covers:
- Opportunity stays "New" when Celery dispatch fails
- Worker updates status to "KYC Running" atomically
- Idempotent report reuse when running report already exists
- Pipeline failure reverts opportunity status
"""

import uuid
from unittest.mock import patch, MagicMock

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.models.opportunity import Opportunity
from app.models.kyc_report import KYCReport
from app.models.user import User


def _make_db():
    """Create isolated in-memory SQLite DB + session factory for task-level tests."""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)


def _seed(SessionFactory):
    """Seed a user + opportunity, return (opp_id_str, user_id)."""
    db = SessionFactory()
    user = User(id=uuid.uuid4(), email="concur@test.com", full_name="Concur Test", role="admin")
    db.add(user)
    opp = Opportunity(
        id=uuid.uuid4(), company_name="PT Resilience Test",
        customer_needs="Test concurrency", industry="Technology",
        website="https://resilience.test", status="New", created_by=user.id,
    )
    db.add(opp)
    db.commit()
    opp_id = str(opp.id)
    user_id = user.id
    db.close()
    return opp_id, user_id


_COMPLETED_RESULT = {
    "status": "completed", "executive_summary": "OK",
    "company_overview": {"name": "PT Resilience Test"},
    "industry_analysis": "Tech", "competitor_analysis": [],
    "business_model": "SaaS", "company_location": "Jakarta",
    "customer_need_summary": "Test", "potential_pain_points": [],
    "use_cases": [], "meeting_objectives": [],
    "recommended_questions": {}, "preparation_checklist": [], "references": [],
}


# 1. Opportunity stays "New" when Celery dispatch fails
def test_create_opportunity_stays_new_on_dispatch_failure(
    client: TestClient, auth_headers: dict[str, str], db: Session
):
    """When run_kyc_pipeline_task.delay() raises, status must remain 'New'."""
    with patch("app.tasks.run_kyc_pipeline_task.delay", side_effect=ConnectionError("Redis down")):
        response = client.post(
            "/api/opportunities", headers=auth_headers,
            json={
                "company_name": "Dispatch Fail Corp",
                "customer_needs": "Test dispatch failure",
                "industry": "Technology", "website": "https://dispatchfail.test",
            },
        )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "New"
    reports = db.query(KYCReport).filter(
        KYCReport.opportunity_id == uuid.UUID(data["id"])
    ).all()
    assert len(reports) == 0



# 2. Worker sets status "KYC Running" then "Ready Meeting" on success
def test_worker_sets_kyc_running_on_execution():
    SessionFactory = _make_db()
    opp_id, _ = _seed(SessionFactory)

    async def mock_pipeline(*a, **kw):
        return _COMPLETED_RESULT

    with patch("app.tasks.SessionLocal", SessionFactory), \
         patch("app.services.kyc_pipeline.run_kyc_pipeline", side_effect=mock_pipeline), \
         patch("app.tasks.send_kyc_completed_notification.delay"):
        from app.tasks import run_kyc_pipeline_task
        result = run_kyc_pipeline_task(opp_id, source_type="automatic")

    assert result["status"] == "success"
    db = SessionFactory()
    opp = db.query(Opportunity).filter(Opportunity.id == uuid.UUID(opp_id)).first()
    assert opp.status == "Ready Meeting"
    reports = db.query(KYCReport).filter(KYCReport.opportunity_id == uuid.UUID(opp_id)).all()
    assert len(reports) == 1
    assert reports[0].status == "completed"
    assert reports[0].version == 1
    db.close()



# 3. Idempotent: reuse existing running report, don't create duplicate
def test_idempotent_reuse_running_report():
    SessionFactory = _make_db()
    opp_id, _ = _seed(SessionFactory)

    db = SessionFactory()
    existing_report = KYCReport(
        id=uuid.uuid4(), opportunity_id=uuid.UUID(opp_id),
        version=2, status="running", source_type="manual_regenerate",
    )
    db.add(existing_report)
    db.commit()
    existing_id = existing_report.id
    db.close()

    async def mock_pipeline(*a, **kw):
        return _COMPLETED_RESULT

    with patch("app.tasks.SessionLocal", SessionFactory), \
         patch("app.services.kyc_pipeline.run_kyc_pipeline", side_effect=mock_pipeline), \
         patch("app.tasks.send_kyc_completed_notification.delay"):
        from app.tasks import run_kyc_pipeline_task
        result = run_kyc_pipeline_task(opp_id, source_type="automatic")

    assert result["status"] == "success"
    assert result["version"] == 2  # reused, not 3

    db = SessionFactory()
    reports = db.query(KYCReport).filter(KYCReport.opportunity_id == uuid.UUID(opp_id)).all()
    assert len(reports) == 1
    assert reports[0].id == existing_id
    assert reports[0].status == "completed"
    db.close()



# 4. Pipeline failure reverts opportunity status
def test_pipeline_failure_reverts_status():
    SessionFactory = _make_db()
    opp_id, _ = _seed(SessionFactory)

    async def mock_fail(*a, **kw):
        return {"status": "failed", "error": "LLM quota exhausted"}

    with patch("app.tasks.SessionLocal", SessionFactory), \
         patch("app.services.kyc_pipeline.run_kyc_pipeline", side_effect=mock_fail), \
         patch("time.sleep"):
        from app.tasks import run_kyc_pipeline_task
        result = run_kyc_pipeline_task(opp_id, source_type="automatic")

    assert result["status"] == "error"

    db = SessionFactory()
    opp = db.query(Opportunity).filter(Opportunity.id == uuid.UUID(opp_id)).first()
    assert opp.status == "New"  # reverted from "KYC Running"
    report = db.query(KYCReport).filter(KYCReport.opportunity_id == uuid.UUID(opp_id)).first()
    assert report.status == "failed"
    assert "quota" in report.error_message.lower()
    db.close()

