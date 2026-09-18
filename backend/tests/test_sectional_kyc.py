import pytest
from unittest.mock import AsyncMock, MagicMock
from app.schemas.kyc import (
    CompanyProfileOutput,
    IndustryCompetitorsOutput,
    PainPointsNeedsOutput,
    UseCasesOutput,
    EngagementStrategyOutput,
    ExecutiveSummaryOutput,
    CompanyOverviewModel,
    CompetitorItem,
    UseCaseItem,
    CategorizedQuestions,
)
from app.services.kyc_invoker import invoke_section
from app.services.kyc_sectional_runner import run_sectional_kyc_pipeline


@pytest.mark.asyncio
async def test_invoke_section_with_structured_output():
    """Verify invoke_section uses structured output when available."""
    mock_llm = MagicMock()
    mock_runnable = MagicMock()

    expected_data = CompanyProfileOutput(
        company_overview=CompanyOverviewModel(
            name="PT Telko Maju",
            description="Telco provider",
            founded="2010",
            size="500+",
            headquarters="Jakarta",
            key_products=["Fiber", "5G"],
        ),
        business_model="B2B & B2C Subscription",
        company_location="Jakarta, Indonesia",
    )
    mock_runnable.ainvoke = AsyncMock(return_value=expected_data)
    mock_llm.with_structured_output.return_value = mock_runnable

    res = await invoke_section(
        llm=mock_llm,
        schema_cls=CompanyProfileOutput,
        prompt="Test prompt",
        section_name="Module 1 Test",
    )
    assert res.company_overview.name == "PT Telko Maju"
    assert res.business_model == "B2B & B2C Subscription"
    mock_llm.with_structured_output.assert_called_once_with(CompanyProfileOutput)


@pytest.mark.asyncio
async def test_invoke_section_retry_on_transient_failure():
    """Verify invoke_section retries on failure and succeeds on retry without failing whole flow."""
    mock_llm = MagicMock()
    mock_runnable = MagicMock()

    expected_data = PainPointsNeedsOutput(
        customer_need_summary="Success on retry",
        potential_pain_points=["Latency issue"],
    )

    # Fail on first call, succeed on second
    mock_runnable.ainvoke = AsyncMock(
        side_effect=[Exception("Transient LLM drop"), expected_data]
    )
    mock_llm.with_structured_output.return_value = mock_runnable

    res = await invoke_section(
        llm=mock_llm,
        schema_cls=PainPointsNeedsOutput,
        prompt="Test retry prompt",
        section_name="Module 3 Retry Test",
        max_retries=3,
    )

    assert res.customer_need_summary == "Success on retry"
    assert mock_runnable.ainvoke.call_count == 2


@pytest.mark.asyncio
async def test_sectional_pipeline_3phases():
    """Verify run_sectional_kyc_pipeline orchestrates all 6 modules across phases."""
    state = {
        "company_name": "Bank Nusantara",
        "website": "https://banknusantara.co.id",
        "industry": "Financial Services",
        "customer_needs": "Modernize core banking with zero trust security",
        "additional_notes": None,
        "product": "Cybersecurity & Cloud",
        "search_results": {},
        "website_content": None,
        "industry_use_cases": [],
    }

    mock_llm = MagicMock()

    async def mock_invoke(llm, schema_cls, prompt, section_name, **kwargs):
        if schema_cls == CompanyProfileOutput:
            return CompanyProfileOutput(
                company_overview=CompanyOverviewModel(name="Bank Nusantara", description="Digital Bank"),
                business_model="Commercial Banking",
                company_location="Jakarta",
            )
        elif schema_cls == IndustryCompetitorsOutput:
            return IndustryCompetitorsOutput(
                industry_analysis="Banking 4.0 landscape",
                competitor_analysis=[CompetitorItem(name="Bank Mega", market_position="Peer")],
            )
        elif schema_cls == PainPointsNeedsOutput:
            return PainPointsNeedsOutput(
                customer_need_summary="Core modernization needed",
                potential_pain_points=["Legacy DB", "Security silos"],
            )
        elif schema_cls == UseCasesOutput:
            return UseCasesOutput(
                use_cases=[
                    UseCaseItem(
                        title="Zero Trust Perimeter",
                        description="Implement PAM and NGFW",
                        problem_solved="Admin privilege abuse",
                        how_it_works="BeyondTrust + Fortinet",
                        business_impact="99.9% reduced breach surface",
                        google_products=["BeyondTrust PAM", "FortiGate"],
                        smartnet_solutions=["Next-Gen Security"],
                        impact_level="High",
                    )
                ]
            )
        elif schema_cls == EngagementStrategyOutput:
            return EngagementStrategyOutput(
                meeting_objectives=["Review PAM PoC scope"],
                recommended_questions=CategorizedQuestions(
                    business=["What is the expected ROI timeline for security modernization?"],
                    technical=["How are privileged accounts managed today?"],
                ),
                preparation_checklist=["Prepare PAM architecture deck"],
            )
        elif schema_cls == ExecutiveSummaryOutput:
            return ExecutiveSummaryOutput(
                executive_summary="Bank Nusantara is poised for modernization with Smartnet Magna Global solutions."
            )
        raise ValueError(f"Unknown schema: {schema_cls}")

    import app.services.kyc_sectional_runner as runner_mod
    original_invoke = runner_mod.invoke_section
    runner_mod.invoke_section = mock_invoke

    mock_progress = AsyncMock()

    try:
        report = await run_sectional_kyc_pipeline(
            state=state,
            llm=mock_llm,
            config=None,
            update_progress_fn=mock_progress,
            clean_json_fn=lambda x: {},
        )
        assert report["executive_summary"].startswith("Bank Nusantara")
        assert report["company_overview"]["name"] == "Bank Nusantara"
        assert len(report["use_cases"]) == 1
        assert report["use_cases"][0]["title"] == "Zero Trust Perimeter"
        assert len(report["meeting_objectives"]) == 1
        assert report["customer_need_summary"] == "Core modernization needed"
    finally:
        runner_mod.invoke_section = original_invoke


@pytest.mark.asyncio
async def test_invoke_section_auto_recovery_from_validation_error():
    """Verify invoke_section auto-recovers when structured output throws ValidationError with markdown fence."""
    from pydantic import ValidationError
    from app.services.kyc_pipeline import _clean_and_parse_json

    mock_llm = MagicMock()
    mock_runnable = MagicMock()

    # Create a real ValidationError by passing markdown/preamble to model_validate_json
    raw_payload = (
        'Berikut adalah rancangan...\n```json\n{\n'
        '  "meeting_objectives": ["Meeting 1"],\n'
        '  "recommended_questions": {"business": ["B1"], "technical": ["T1"]},\n'
        '  "preparation_checklist": ["Prep 1"]\n'
        '}\n```'
    )
    try:
        EngagementStrategyOutput.model_validate_json(raw_payload)
    except ValidationError as val_err:
        mock_runnable.ainvoke = AsyncMock(side_effect=val_err)

    mock_llm.with_structured_output.return_value = mock_runnable

    res = await invoke_section(
        llm=mock_llm,
        schema_cls=EngagementStrategyOutput,
        prompt="Test prompt",
        section_name="Module 5 Recovery Test",
        clean_json_fn=_clean_and_parse_json,
    )

    assert res.meeting_objectives == ["Meeting 1"]
    assert res.recommended_questions.business == ["B1"]
    assert res.recommended_questions.technical == ["T1"]
    assert res.preparation_checklist == ["Prep 1"]


def test_company_profile_output_schema_resilience():
    """Verify CompanyProfileOutput gracefully handles dicts for text fields and strings for overview."""
    # Scenario 1: LLM returns dicts for business_model and company_location
    payload_dicts = {
        "company_overview": {
            "name": "Microdrama",
            "description": "Short video platform",
            "key_products": "Product A, Product B",
        },
        "business_model": {"model_type": "B2B & B2C", "revenue": "$11-20B"},
        "company_location": {"headquarters": "Jakarta, Indonesia"},
    }
    model1 = CompanyProfileOutput.model_validate(payload_dicts)
    assert model1.company_overview.name == "Microdrama"
    assert "Product A" in model1.company_overview.key_products
    assert "Model Type: B2B & B2C" in model1.business_model
    assert "Headquarters: Jakarta, Indonesia" in model1.company_location

    # Scenario 2: LLM returns plain string for company_overview
    payload_str_overview = {
        "company_overview": "Microdrama adalah platform hiburan digital yang berkembang pesat.",
        "business_model": "Subscription model",
        "company_location": "Global",
    }
    model2 = CompanyProfileOutput.model_validate(payload_str_overview)
    assert model2.company_overview.description == "Microdrama adalah platform hiburan digital yang berkembang pesat."
    assert model2.business_model == "Subscription model"


def test_use_cases_output_schema_resilience():
    """Verify UseCasesOutput resilience against arrays, aliases, and string product fields."""
    # Scenario 1: Model returns top-level list
    raw_list = [
        {
            "title": "Predictive Maintenance",
            "description": "IoT analytics for heavy equipment",
            "problem_solved": "Cost-per-tonne reduction",
            "how_it_works": "Sensors to BigQuery ML",
            "business_impact": "15% OPEX saving",
            "google_products": "BigQuery, Vertex AI",
            "smartnet_solutions": "Cloud Analytics",
            "impact_level": "High",
        }
    ]
    model1 = UseCasesOutput.model_validate(raw_list)
    assert len(model1.use_cases) == 1
    assert model1.use_cases[0].title == "Predictive Maintenance"
    assert model1.use_cases[0].google_products == ["BigQuery", "Vertex AI"]
    assert model1.use_cases[0].smartnet_solutions == ["Cloud Analytics"]

    # Scenario 2: Model returns dict with alias 'items'
    raw_alias = {
        "items": [
            {
                "title": "Zero Trust PAM",
                "description": "Securing admin accounts",
                "problem_solved": "Privilege abuse",
                "how_it_works": "BeyondTrust deployment",
                "business_impact": "99% compliance",
                "vendor_products": ["BeyondTrust PAM"],
                "impact_level": "High",
            }
        ]
    }
    model2 = UseCasesOutput.model_validate(raw_alias)
    assert len(model2.use_cases) == 1
    assert model2.use_cases[0].title == "Zero Trust PAM"
    assert model2.use_cases[0].google_products == ["BeyondTrust PAM"]


def test_clean_and_parse_json_robustness():
    """Verify _clean_and_parse_json extracts JSON from conversational prose and arrays."""
    from app.services.kyc_pipeline import _clean_and_parse_json

    # Conversational prefix and suffix
    raw_prose = (
        "Berikut adalah 3 Use Cases untuk klien:\n"
        "```json\n"
        "{\n"
        '  "use_cases": [{"title": "Cloud Migration", "impact_level": "High"}]\n'
        "}\n"
        "```\n"
        "Semoga bermanfaat!"
    )
    parsed = _clean_and_parse_json(raw_prose)
    assert "use_cases" in parsed
    assert parsed["use_cases"][0]["title"] == "Cloud Migration"

    # JSON Array
    raw_array = '[{"title": "UC 1"}, {"title": "UC 2"}]'
    parsed_arr = _clean_and_parse_json(raw_array)
    assert isinstance(parsed_arr, list)
    assert len(parsed_arr) == 2

    # Non-JSON raises clean ValueError
    with pytest.raises(ValueError, match="No JSON object or array found"):
        _clean_and_parse_json("Berikut adalah laporan tanpa format JSON sama sekali.")


@pytest.mark.asyncio
async def test_invoke_section_error_feedback_on_retry():
    """Verify invoke_section appends corrective error feedback into prompt on attempt > 1."""
    mock_llm = MagicMock()
    mock_runnable = MagicMock()

    prompts_called = []

    async def mock_ainvoke(prompt_text):
        prompts_called.append(prompt_text)
        if len(prompts_called) == 1:
            raise ValueError("Invalid JSON: expected value at line 1 column 1")
        return PainPointsNeedsOutput(
            customer_need_summary="Fixed on attempt 2",
            potential_pain_points=["Issue A"],
        )

    mock_runnable.ainvoke = AsyncMock(side_effect=mock_ainvoke)
    mock_llm.with_structured_output.return_value = mock_runnable
    mock_llm.ainvoke = AsyncMock(side_effect=mock_ainvoke)

    res = await invoke_section(
        llm=mock_llm,
        schema_cls=PainPointsNeedsOutput,
        prompt="Original Module 3 prompt",
        section_name="Module 3 Corrective Test",
        max_retries=3,
    )

    assert res.customer_need_summary == "Fixed on attempt 2"
    # Attempt 2 includes corrective warning header
    assert any("PERINGATAN PERBAIKAN FORMAT" in p for p in prompts_called)


def test_is_retryable_kyc_error_logic():
    """Verify _is_retryable_kyc_error distinguishes transient errors from fatal ones."""
    from app.tasks import _is_retryable_kyc_error

    # Transient / retryable
    assert _is_retryable_kyc_error("1 validation error for UseCasesOutput Invalid JSON") is True
    assert _is_retryable_kyc_error("Rate limit reached 429 ResourceExhausted") is True
    assert _is_retryable_kyc_error("AI analysis failed: Connection timed out") is True
    assert _is_retryable_kyc_error("503 Service Unavailable") is True

    # Fatal / non-retryable
    assert _is_retryable_kyc_error("No LLM API Key (OPENAI_API_KEY or GEMINI_API_KEY) configured") is False
    assert _is_retryable_kyc_error("Invalid API Key provided") is False
    assert _is_retryable_kyc_error("Opportunity not found") is False
    assert _is_retryable_kyc_error("") is False


def test_run_kyc_pipeline_task_in_place_retry():
    """Verify run_kyc_pipeline_task retries in-place on transient error and succeeds without incrementing version."""
    import uuid
    from unittest.mock import patch
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.core.database import Base
    from app.tasks import run_kyc_pipeline_task
    from app.models.opportunity import Opportunity
    from app.models.kyc_report import KYCReport
    from app.models.user import User

    local_engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=local_engine)
    LocalSession = sessionmaker(bind=local_engine)

    init_db = LocalSession()
    user = User(
        id=uuid.uuid4(),
        email="retry_test_user@example.com",
        full_name="Retry Tester",
        role="admin",
    )
    init_db.add(user)

    opp = Opportunity(
        id=uuid.uuid4(),
        company_name="PT Darma Henwa Test",
        customer_needs="Predictive maintenance",
        status="Draft",
        created_by=user.id,
    )
    init_db.add(opp)
    init_db.commit()
    opp_id = str(opp.id)
    init_db.close()

    call_count = 0

    async def mock_run_pipeline(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return {"status": "failed", "error": "AI analysis failed: 1 validation error for UseCasesOutput Invalid JSON"}
        return {
            "status": "completed",
            "executive_summary": "Summary",
            "company_overview": {"name": "PT Darma Henwa Test"},
            "industry_analysis": "Mining",
            "competitor_analysis": [],
            "business_model": "Mining contractor",
            "company_location": "Jakarta",
            "customer_need_summary": "Predictive maintenance",
            "potential_pain_points": ["Heavy equipment downtime"],
            "use_cases": [{"title": "Condition Monitoring", "impact_level": "High"}],
            "meeting_objectives": ["Meeting"],
            "recommended_questions": {"business": [], "technical": []},
            "preparation_checklist": [],
            "references": [],
        }

    with patch("app.tasks.SessionLocal", LocalSession), \
         patch("app.services.kyc_pipeline.run_kyc_pipeline", side_effect=mock_run_pipeline), \
         patch("app.tasks.send_kyc_completed_notification.delay"), \
         patch("time.sleep"):

        result = run_kyc_pipeline_task(opp_id, source_type="automatic")

    assert result["status"] == "success"
    assert result["version"] == 1
    assert call_count == 2

    # Verify only 1 KYCReport exists, remaining version 1 with completed status
    verify_db = LocalSession()
    reports = verify_db.query(KYCReport).filter(KYCReport.opportunity_id == uuid.UUID(opp_id)).all()
    assert len(reports) == 1
    assert reports[0].version == 1
    assert reports[0].status == "completed"

    # Verify opportunity status is Ready Meeting
    opp_refreshed = verify_db.query(Opportunity).filter(Opportunity.id == uuid.UUID(opp_id)).first()
    assert opp_refreshed.status == "Ready Meeting"
    verify_db.close()




