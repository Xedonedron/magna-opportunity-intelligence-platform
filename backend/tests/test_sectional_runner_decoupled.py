"""Tests for decoupled sectional runner architecture (Layer A / Layer B)."""

import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.schemas.kyc import (
    CompanyProfileOutput,
    CompanyOverviewModel,
    IndustryCompetitorsOutput,
    CompetitorItem,
    PainPointsNeedsOutput,
    UseCasesOutput,
    UseCaseItem,
    EngagementStrategyOutput,
    ExecutiveSummaryOutput,
    CategorizedQuestions,
)
from app.services.kyc_sectional_runner import (
    run_company_foundation,
    run_opportunity_intelligence,
    run_sectional_kyc_pipeline,
)


def _mock_state(**overrides):
    base = {
        "company_name": "PT ABC Indonesia",
        "website": "https://abc.co.id",
        "industry": "Banking",
        "customer_needs": "Butuh firewall next-gen",
        "additional_notes": None,
        "product": "Fortinet FortiGate",
        "focus_notes": None,
        "search_results": {"company_answer": "ABC is a bank", "company_info": [], "news": []},
        "website_content": None,
        "industry_use_cases": [],
        "existing_company_profile": None,
    }
    base.update(overrides)
    return base


def _make_mod1():
    return CompanyProfileOutput(
        company_overview=CompanyOverviewModel(
            name="PT ABC Indonesia", description="Major Indonesian bank",
            founded="1990", size="5000+", headquarters="Jakarta", key_products=["Savings", "Loans"],
        ),
        business_model="Retail and corporate banking",
        company_location="Jakarta, Indonesia",
    )


def _make_mod2():
    return IndustryCompetitorsOutput(
        industry_analysis="Banking sector growing steadily",
        competitor_analysis=[CompetitorItem(name="Bank XYZ", market_position="Leader", strengths=["Large network"], weaknesses=["Slow digital"], differentiators="More branches")],
    )


def _make_mod3():
    return PainPointsNeedsOutput(customer_need_summary="Need firewall to protect core banking", potential_pain_points=["Legacy firewall EOL", "No centralized monitoring"])


def _make_mod4():
    return UseCasesOutput(use_cases=[UseCaseItem(
        title="Next-Gen Firewall Deployment", description="Replace legacy firewall",
        problem_solved="EOL firewall risk", how_it_works="FortiGate cluster with FortiManager",
        business_impact="99.9% uptime", google_products=["FortiGate 600F"],
        smartnet_solutions=["SMG Managed Firewall"], impact_level="High",
    )])


def _make_mod5():
    return EngagementStrategyOutput(
        meeting_objectives=["Understand current firewall topology"],
        recommended_questions=CategorizedQuestions(business=["Cost of breach?"], technical=["Current throughput?"]),
        preparation_checklist=["Prepare FortiGate datasheet"],
    )


def _make_mod6():
    return ExecutiveSummaryOutput(executive_summary="PT ABC Indonesia needs next-gen firewall...")


@pytest.mark.asyncio
async def test_run_company_foundation_produces_mod1_mod2():
    state = _mock_state()
    with patch("app.services.kyc_sectional_runner.invoke_section") as mock_invoke:
        mock_invoke.side_effect = [_make_mod1(), _make_mod2()]
        mod1, mod2 = await run_company_foundation(state, MagicMock(), "base context", lambda x: x)
    assert mod1.company_overview.name == "PT ABC Indonesia"
    assert mod2.industry_analysis == "Banking sector growing steadily"
    assert mock_invoke.call_count == 2


@pytest.mark.asyncio
async def test_run_opportunity_intelligence_produces_mod3_to_6():
    state = _mock_state()
    with patch("app.services.kyc_sectional_runner.invoke_section") as mock_invoke:
        mock_invoke.side_effect = [_make_mod3(), _make_mod4(), _make_mod5(), _make_mod6()]
        mod3, mod4, mod5, mod6 = await run_opportunity_intelligence(
            state=state, mod1=_make_mod1(), mod2=_make_mod2(), llm=MagicMock(),
            config=None, update_progress_fn=AsyncMock(), clean_json_fn=lambda x: x,
            base_context="ctx", use_cases_context="", solutions_context="", matched_smg_cards=[],
        )
    assert mod3.customer_need_summary == "Need firewall to protect core banking"
    assert len(mod4.use_cases) == 1
    assert "PT ABC Indonesia" in mod6.executive_summary
    assert mock_invoke.call_count == 4


@pytest.mark.asyncio
async def test_run_opportunity_intelligence_writes_routed_cards_to_state():
    """Bug #1 regression: routed_cards must be written to state['matched_smg_cards']."""
    state = _mock_state(industry="Banking")
    # Patch route_presales_solutions to return a known card list
    fake_card = MagicMock()
    fake_card.title = "PAM Solution"
    fake_card.source_url = "https://example.com/pam"
    fake_card.primary_products = ["BeyondTrust"]
    fake_card.all_products = ["BeyondTrust"]
    with patch("app.services.kyc_sectional_runner.invoke_section") as mock_invoke, \
         patch("app.services.kyc_sectional_runner.solutions_catalog") as mock_catalog:
        mock_invoke.side_effect = [_make_mod3(), _make_mod4(), _make_mod5(), _make_mod6()]
        mock_catalog.route_presales_solutions.return_value = ("routed ctx", [fake_card], [])
        await run_opportunity_intelligence(
            state=state, mod1=_make_mod1(), mod2=_make_mod2(), llm=MagicMock(),
            config=None, update_progress_fn=AsyncMock(), clean_json_fn=lambda x: x,
            base_context="ctx", use_cases_context="", solutions_context="", matched_smg_cards=[],
        )
    assert state.get("matched_smg_cards") == [fake_card], "routed_cards must propagate to state"


@pytest.mark.asyncio
async def test_orchestrator_reuses_cached_profile():
    cached = {
        "company_overview": {"name": "PT ABC Indonesia", "description": "Bank", "key_products": []},
        "industry_analysis": "Banking sector",
        "competitor_analysis": [], "business_model": "Retail banking", "company_location": "Jakarta",
    }
    state = _mock_state(existing_company_profile=cached)
    with patch("app.services.kyc_sectional_runner.invoke_section") as mock_invoke, \
         patch("app.services.kyc_sectional_runner.link_verifier_service") as mock_v:
        mock_invoke.side_effect = [_make_mod3(), _make_mod4(), _make_mod5(), _make_mod6()]
        mock_v.sanitize_references_and_sources = AsyncMock(return_value=[])
        result = await run_sectional_kyc_pipeline(
            state=state, llm=MagicMock(), config=None,
            update_progress_fn=AsyncMock(), clean_json_fn=lambda x: x,
        )
    assert mock_invoke.call_count == 4  # Only Mod 3-6
    assert result["reused_company_profile"] is True


@pytest.mark.asyncio
async def test_orchestrator_full_pipeline_no_cache():
    state = _mock_state()
    with patch("app.services.kyc_sectional_runner.invoke_section") as mock_invoke, \
         patch("app.services.kyc_sectional_runner.link_verifier_service") as mock_v:
        mock_invoke.side_effect = [_make_mod1(), _make_mod2(), _make_mod3(), _make_mod4(), _make_mod5(), _make_mod6()]
        mock_v.sanitize_references_and_sources = AsyncMock(return_value=[])
        result = await run_sectional_kyc_pipeline(
            state=state, llm=MagicMock(), config=None,
            update_progress_fn=AsyncMock(), clean_json_fn=lambda x: x,
        )
    assert mock_invoke.call_count == 6  # All Mod 1-6
    assert result["reused_company_profile"] is False
    assert result["executive_summary"] == "PT ABC Indonesia needs next-gen firewall..."


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

