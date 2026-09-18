"""
backend/tests/test_company_reuse_kyc.py

Tests for Zero-Redundant KYC (Phase 1 & Phase 2 Module Reuse).
Verifies that when an opportunity belongs to a company with an existing verified profile,
Module 1 (Company Overview) and Module 2 (Industry Analysis) are bypassed, saving LLM tokens.
"""

from unittest.mock import AsyncMock, patch, MagicMock
import pytest

from app.schemas.kyc import (
    CompanyProfileOutput,
    CompanyOverviewModel,
    IndustryCompetitorsOutput,
    CompetitorItem,
    PainPointsNeedsOutput,
    UseCasesOutput,
    UseCaseItem,
    EngagementStrategyOutput,
    CategorizedQuestions,
    ExecutiveSummaryOutput,
)
from app.services.kyc_sectional_runner import run_sectional_kyc_pipeline


@pytest.mark.asyncio
async def test_sectional_runner_bypasses_m1_and_m2_when_profile_reused():
    """
    When existing_company_profile is provided:
    - invoke_section MUST NOT be called for Module 1 or Module 2
    - invoke_section MUST be called for Module 3, Module 4, Module 5, Module 6
    - Final state must retain reused overview and mark reused_company_profile=True
    """
    existing_profile = {
        "company_overview": CompanyOverviewModel(
            name="Danone Indonesia",
            description="Danone Indonesia is a leading FMCG enterprise in health food and beverages.",
        ),
        "industry_analysis": "Highly competitive FMCG market with stringent cold chain logistics.",
        "competitor_analysis": [CompetitorItem(name="Nestle", market_position="Direct Peer")],
        "business_model": "B2B and B2C FMCG distribution",
        "company_location": "Jakarta, Indonesia",
        "source_opportunity_id": "9a7d081f-0000-0000-0000-000000000000",
    }

    invoked_sections = []

    async def mock_invoke(llm, schema_cls, prompt, section_name, **kwargs):
        invoked_sections.append(section_name)
        if schema_cls == CompanyProfileOutput:
            return CompanyProfileOutput(
                company_overview=CompanyOverviewModel(name="Danone Indonesia", description="Generated desc"),
                business_model="B2B & B2C",
                company_location="Jakarta",
            )
        elif schema_cls == IndustryCompetitorsOutput:
            return IndustryCompetitorsOutput(industry_analysis="Generated industry")
        elif schema_cls == PainPointsNeedsOutput:
            return PainPointsNeedsOutput(
                customer_need_summary="Need automated supply chain tracking.",
                potential_pain_points=["Manual dispatch tracking", "Inventory discrepancies"],
            )
        elif schema_cls == UseCasesOutput:
            return UseCasesOutput(
                use_cases=[
                    UseCaseItem(
                        title="Real-time Telematics on BigQuery",
                        description="Fleet tracking",
                        problem_solved="Delayed logistics",
                        how_it_works="IoT stream to Pub/Sub",
                        business_impact="15% fuel efficiency",
                        google_products=["BigQuery", "Pub/Sub"],
                        smartnet_solutions=["IoT Analytics"],
                        impact_level="High",
                    )
                ],
            )
        elif schema_cls == EngagementStrategyOutput:
            return EngagementStrategyOutput(
                meeting_objectives=["Align on technical scope"],
                recommended_questions=CategorizedQuestions(
                    business=["What is current ROI expectation?"],
                    technical=["What is current TMS stack?"],
                ),
                preparation_checklist=["Prepare IoT demo"],
            )
        elif schema_cls == ExecutiveSummaryOutput:
            return ExecutiveSummaryOutput(
                executive_summary="Danone Indonesia is expanding its supply chain...",
            )
        raise ValueError(f"Unexpected schema_cls {schema_cls}")

    state = {
        "company_name": "Danone Indonesia",
        "customer_needs": "Need automated supply chain tracking.",
        "company_id": "danone-company-uuid",
        "existing_company_profile": existing_profile,
        "reused_company_profile": False,
        "search_results": {},
        "website_content": None,
        "industry_use_cases": [],
    }

    with patch("app.services.kyc_sectional_runner.invoke_section", side_effect=mock_invoke):
        result = await run_sectional_kyc_pipeline(
            state=state,
            config={"configurable": {}},
            llm=MagicMock(),
            clean_json_fn=lambda x: x,
            update_progress_fn=AsyncMock(),
        )

        # M1 & M2 must NOT be in invoked_sections (Zero-Redundant KYC)
        assert "Module 1" not in invoked_sections, "Module 1 should have been bypassed!"
        assert "Module 2" not in invoked_sections, "Module 2 should have been bypassed!"

        # M3, M4, M5, M6 MUST be invoked
        assert "Module 3" in invoked_sections
        assert "Module 4" in invoked_sections
        assert "Module 5" in invoked_sections
        assert "Module 6" in invoked_sections

        # Reused fields properly populated
        assert result["reused_company_profile"] is True
        assert result["company_overview"]["name"] == "Danone Indonesia"
        assert result["industry_analysis"] == existing_profile["industry_analysis"]


@pytest.mark.asyncio
async def test_sectional_runner_executes_all_modules_when_no_existing_profile():
    """
    When existing_company_profile is None, all modules (Module 1 through 6) must execute.
    """
    invoked_sections = []

    async def mock_invoke(llm, schema_cls, prompt, section_name, **kwargs):
        invoked_sections.append(section_name)
        if schema_cls == CompanyProfileOutput:
            return CompanyProfileOutput(
                company_overview=CompanyOverviewModel(name="New Corp", description="Fresh desc"),
                business_model="B2B SaaS",
                company_location="Jakarta",
            )
        elif schema_cls == IndustryCompetitorsOutput:
            return IndustryCompetitorsOutput(industry_analysis="Fresh industry")
        elif schema_cls == PainPointsNeedsOutput:
            return PainPointsNeedsOutput(
                customer_need_summary="Fresh needs",
                potential_pain_points=["Bottleneck 1"],
            )
        elif schema_cls == UseCasesOutput:
            return UseCasesOutput(
                use_cases=[
                    UseCaseItem(
                        title="Use Case 1",
                        description="Desc 1",
                        problem_solved="Problem 1",
                        how_it_works="Tech stack",
                        business_impact="High impact",
                        google_products=["Cloud"],
                        smartnet_solutions=["Solution"],
                        impact_level="High",
                    )
                ],
            )
        elif schema_cls == EngagementStrategyOutput:
            return EngagementStrategyOutput(
                meeting_objectives=["Obj 1"],
                recommended_questions=CategorizedQuestions(
                    business=["Business Q1"],
                    technical=["Technical Q1"],
                ),
                preparation_checklist=["Check 1"],
            )
        elif schema_cls == ExecutiveSummaryOutput:
            return ExecutiveSummaryOutput(
                executive_summary="Fresh Exec Summary",
            )
        raise ValueError(f"Unexpected schema_cls {schema_cls}")

    state = {
        "company_name": "New Enterprise Corp",
        "customer_needs": "Cloud migration",
        "company_id": None,
        "existing_company_profile": None,
        "reused_company_profile": False,
        "search_results": {},
        "website_content": None,
        "industry_use_cases": [],
    }

    with patch("app.services.kyc_sectional_runner.invoke_section", side_effect=mock_invoke):
        result = await run_sectional_kyc_pipeline(
            state=state,
            config={"configurable": {}},
            llm=MagicMock(),
            clean_json_fn=lambda x: x,
            update_progress_fn=AsyncMock(),
        )

        # All 6 modules must be invoked
        assert "Module 1" in invoked_sections
        assert "Module 2" in invoked_sections
        assert "Module 3" in invoked_sections
        assert "Module 4" in invoked_sections
        assert "Module 5" in invoked_sections
        assert "Module 6" in invoked_sections

        assert result["reused_company_profile"] is False
        assert result["company_overview"]["name"] == "New Corp"
