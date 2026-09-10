"""Tests for the AI models KYC benchmark script and model overriding logic."""

import uuid
from unittest.mock import patch, MagicMock, AsyncMock
from sqlalchemy.orm import Session

from app.models.opportunity import Opportunity
from app.models.kyc_report import KYCReport
from app.models.user import User
from app.services.ai_usage_service import calculate_cost, get_model_rate
from scripts.benchmark_models_kyc import validate_kyc_sections, generate_markdown_report


def test_model_rates_benchmark_models():
    """Verify rate cards are registered for all 6 benchmark models."""
    models = [
        "gemini-3.8-flash",
        "deepseek-v4-pro",
        "deepseek-v4-flash",
        "qwen-3.8-max",
        "claude-opus-4.7",
        "glm-5.1",
    ]
    for model in models:
        rate = get_model_rate(model)
        assert rate is not None
        assert len(rate) == 2
        # Input rate and output rate should be positive numbers
        assert rate[0] > 0
        assert rate[1] > 0

        cost_usd, cost_idr = calculate_cost(model, 1000, 1000)
        assert cost_usd > 0
        assert cost_idr > 0


def test_validate_kyc_sections_completeness():
    """Test validation and scoring for generated KYC sections."""
    sample_report = {
        "executive_summary": "Executive summary of company profile.",
        "company_overview": {
            "name": "PT Benchmark Corp",
            "description": "IT services provider",
            "founded": "2020",
            "size": "50-100",
            "headquarters": "Jakarta",
            "key_products": ["Cloud", "DevOps"],
        },
        "industry_analysis": "Industry is adopting cloud native rapidly.",
        "competitor_analysis": [{"name": "Competitor A", "market_position": "Leader"}],
        "business_model": "B2B SaaS and consulting.",
        "company_location": "Jakarta, Indonesia",
        "customer_need_summary": "Customer needs hybrid cloud infrastructure.",
        "potential_pain_points": ["Legacy on-premise hardware", "High maintenance cost"],
        "use_cases": [
            {"title": "High Priority Use Case", "impact_level": "High"},
            {"title": "Medium Priority Use Case", "impact_level": "Medium"},
            {"title": "Low Priority Use Case", "impact_level": "Low"},
        ],
        "meeting_objectives": ["Discuss requirements", "Present demo"],
        "recommended_questions": ["What is your migration timeline?"],
        "preparation_checklist": ["Prepare presentation slides"],
        "references": [{"title": "Company Website", "url": "https://example.com"}],
    }

    validation = validate_kyc_sections(sample_report)
    assert validation["is_valid_json"] is True
    assert validation["completeness_score_pct"] == 100.0
    assert len(validation["missing_sections"]) == 0
    assert validation["use_cases_count"] == 3
    assert validation["use_cases_ordered"] is True
    assert validation["competitors_count"] == 1
    assert validation["pain_points_count"] == 2
    assert validation["references_count"] == 1


def test_generate_markdown_report_formatting():
    """Test Markdown report generation from benchmark results."""
    mock_results = [
        {
            "model": "qwen-3.8-max",
            "opportunity_id": str(uuid.uuid4()),
            "company_name": "PT Benchmark Test",
            "kyc_version": 2,
            "status": "completed",
            "total_duration_s": 25.4,
            "llm_duration_s": 12.1,
            "search_duration_s": 13.3,
            "prompt_tokens": 3500,
            "completion_tokens": 1200,
            "total_tokens": 4700,
            "tokens_per_sec": 99.2,
            "cost_usd": 0.0028,
            "cost_idr": 45.36,
            "validation": {
                "completeness_score_pct": 100.0,
                "executive_summary_chars": 500,
                "use_cases_count": 3,
                "use_cases_ordered": True,
                "competitors_count": 2,
                "pain_points_count": 3,
                "references_count": 2,
                "missing_sections": [],
            },
        }
    ]

    report_md = generate_markdown_report(mock_results, "20260910_120000")
    assert "# Model Comparison Benchmark Report" in report_md
    assert "qwen-3.8-max" in report_md
    assert "PT Benchmark Test" in report_md
    assert "99.2 tok/s" in report_md
    assert "100.0%" in report_md


def test_celery_task_passes_model_name(db: Session):
    """Verify run_kyc_pipeline_task passes model_name to run_kyc_pipeline."""
    user = User(
        id=uuid.uuid4(),
        email="test_model_pass@example.com",
        full_name="Model Tester",
        role="admin",
        capabilities="view,create_edit,delete,generate_kyc,user_management",
    )
    db.add(user)

    opp = Opportunity(
        id=uuid.uuid4(),
        company_name="PT Test Celery Model",
        customer_needs="Needs BigQuery AI pipeline",
        status="New",
        created_by=user.id,
    )
    db.add(opp)
    db.commit()
    from tests.conftest import TestingSessionLocal
    bind = db.get_bind()

    with patch("app.tasks.SessionLocal", side_effect=lambda: TestingSessionLocal(bind=bind)), \
         patch("app.tasks.send_kyc_completed_notification.delay"), \
         patch("app.services.kyc_pipeline.run_kyc_pipeline", new_callable=AsyncMock) as mock_pipeline:
        mock_pipeline.return_value = {
            "status": "completed",
            "executive_summary": "Test summary",
            "company_overview": {},
            "industry_analysis": "Test industry",
            "competitor_analysis": [],
            "business_model": "Test model",
            "company_location": "Jakarta",
            "customer_need_summary": "Test need",
            "potential_pain_points": [],
            "use_cases": [],
            "meeting_objectives": [],
            "recommended_questions": [],
            "preparation_checklist": [],
            "references": [],
        }

        from app.tasks import run_kyc_pipeline_task

        res = run_kyc_pipeline_task(
            opportunity_id=str(opp.id),
            source_type="benchmark",
            model_name="deepseek-v4-pro",
        )

        assert res["status"] == "success"
        mock_pipeline.assert_called_once()
        _, kwargs = mock_pipeline.call_args
        assert kwargs.get("model_name") == "deepseek-v4-pro"
        assert kwargs.get("source_type") == "benchmark"
