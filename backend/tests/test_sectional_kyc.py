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
                recommended_questions=["How are privileged accounts managed?"],
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
