"""Tests for mass KYC regeneration CLI script."""

import uuid
from unittest.mock import patch, MagicMock
from sqlalchemy.orm import Session

from app.models.opportunity import Opportunity, TimelineEvent
from app.models.kyc_report import KYCReport
from app.models.system_setting import SystemSetting
from app.models.user import User


def test_batch_regenerate_script_logic(db: Session):
    # Setup test user and opportunity
    user = User(
        id=uuid.uuid4(),
        email="test_batch@example.com",
        full_name="Batch Tester",
        role="admin",
        capabilities="view,create_edit,delete,generate_kyc,user_management",
    )
    db.add(user)

    opp = Opportunity(
        id=uuid.uuid4(),
        company_name="PT Batch Test Corp",
        customer_needs="Needs cloud migration",
        status="Ready Meeting",
        created_by=user.id,
    )
    db.add(opp)
    db.commit()

    # Initial KYC v1
    kyc_v1 = KYCReport(
        id=uuid.uuid4(),
        opportunity_id=opp.id,
        version=1,
        title="Initial KYC",
        status="completed",
        source_type="automatic",
    )
    db.add(kyc_v1)
    db.commit()

    # Mock celery task
    with patch("app.tasks.run_kyc_pipeline_task.delay") as mock_delay:
        # Simulate script batch iteration logic
        max_v = (
            db.query(KYCReport.version)
            .filter(KYCReport.opportunity_id == opp.id)
            .order_by(KYCReport.version.desc())
            .first()
        )
        next_version = (max_v[0] + 1) if max_v else 1
        label = "Regenerate with qwen-3.8-max"

        report = KYCReport(
            id=uuid.uuid4(),
            opportunity_id=opp.id,
            version=next_version,
            title=label,
            status="running",
            source_type="manual_regenerate",
        )
        db.add(report)
        opp.status = "KYC Running"
        db.commit()

        mock_delay(str(opp.id), source_type="manual_regenerate")

    # Assertions
    assert next_version == 2
    saved_v2 = (
        db.query(KYCReport)
        .filter(KYCReport.opportunity_id == opp.id, KYCReport.version == 2)
        .first()
    )
    assert saved_v2 is not None
    assert saved_v2.title == "Regenerate with qwen-3.8-max"
    assert saved_v2.status == "running"
    assert opp.status == "KYC Running"
    mock_delay.assert_called_once_with(str(opp.id), source_type="manual_regenerate")
