"""AI KYC Pipeline using LangGraph and Sectional Native Structured Output for KYC report generation."""

import asyncio
import re
import json
import logging
from datetime import datetime, timezone
from typing import Any, Callable, Optional, TypedDict

from langchain_openai import ChatOpenAI
from langchain_core.runnables import RunnableConfig
from langgraph.graph import StateGraph, END

from app.core.config import settings
from app.core.llm import get_chat_llm, has_active_llm_key, get_db_setting
from app.services.web_search_service import web_search_service
from app.services.web_crawler_service import web_crawler_service
from app.services.link_verifier import link_verifier_service
from app.core.solutions_catalog import solutions_catalog
from app.services.kyc_sectional_runner import run_sectional_kyc_pipeline
from app.schemas.kyc import (
    CompanyOverviewModel,
    CompetitorItem,
    UseCaseItem,
    CompanyProfileOutput,
    IndustryCompetitorsOutput,
    PainPointsNeedsOutput,
    UseCasesOutput,
    EngagementStrategyOutput,
    ExecutiveSummaryOutput,
    CategorizedQuestions,
)

logger = logging.getLogger(__name__)



# --- State Definition ---
class KYCState(TypedDict):
    """State passed through the KYC pipeline graph."""
    # Input
    company_name: str
    website: Optional[str]
    industry: Optional[str]
    customer_needs: str
    additional_notes: Optional[str]
    product: Optional[str]
    opportunity_id: Optional[str]
    user_id: Optional[str]
    kyc_version: Optional[int]
    source_type: Optional[str]
    focus_notes: Optional[str]
    model_name: Optional[str]

    # Intermediate results
    search_results: dict
    website_content: Optional[dict]
    industry_use_cases: list

    # Output sections
    executive_summary: str
    company_overview: dict
    industry_analysis: str
    competitor_analysis: list[dict]
    business_model: str
    company_location: str
    customer_need_summary: str
    potential_pain_points: list[str]
    use_cases: list[dict]
    meeting_objectives: list[str]
    recommended_questions: dict
    preparation_checklist: list[str]
    references: list[dict]

    # Metadata
    error: Optional[str]


# --- Helper for robust JSON parsing ---
def _clean_and_parse_json(content: Any) -> dict:
    """Robustly clean and parse JSON output from LLM, fixing common formatting defects and truncated outputs."""
    if isinstance(content, list):
        content = "".join([c.get("text", "") if isinstance(c, dict) else str(c) for c in content])
    if not content or not isinstance(content, str):
        raise ValueError("Empty response content from AI model")

    text = content.strip()

    # 1. Extract markdown fence if present
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)(?:```|$)", text, re.IGNORECASE)
    if fence_match and fence_match.group(1).strip():
        text = fence_match.group(1).strip()

    # 2. Slice from first '{'
    start_idx = text.find("{")
    if start_idx != -1:
        text = text[start_idx:]

    # 3. Clean trailing commas inside arrays/objects (e.g. ", }", ", ]")
    text = re.sub(r",\s*([\}\]])", r"\1", text)

    # 4. Try standard JSON parse on balanced substring first
    end_idx = text.rfind("}")
    if end_idx != -1:
        candidate = text[: end_idx + 1]
        candidate = re.sub(r",\s*([\}\]])", r"\1", candidate)
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

    # 5. Try escaping unescaped newlines/tabs inside strings
    fixed = re.sub(r'(?<!\\)\r?\n', r'\\n', text)
    fixed = re.sub(r'(?<!\\)\t', r'\\t', fixed)
    try:
        return json.loads(fixed)
    except Exception:
        pass

    # 6. Truncation self-healing: balance open quotes, arrays, and objects
    # ponytail: basic structural repair, full LLM retry kicks in if this raises JSONDecodeError
    in_string = False
    escape = False
    stack = []
    for ch in text:
        if escape:
            escape = False
            continue
        if ch == '\\':
            escape = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if not in_string:
            if ch in ('{', '['):
                stack.append(ch)
            elif ch == '}' and stack and stack[-1] == '{':
                stack.pop()
            elif ch == ']' and stack and stack[-1] == '[':
                stack.pop()

    repaired = text
    if in_string:
        repaired += '"'

    repaired = re.sub(r",\s*$", "", repaired.strip())
    while stack:
        opener = stack.pop()
        repaired = re.sub(r",\s*$", "", repaired.strip())
        if opener == '{':
            repaired += "}"
        elif opener == '[':
            repaired += "]"

    repaired = re.sub(r",\s*([\}\]])", r"\1", repaired)
    return json.loads(repaired)


# --- LLM Setup ---
def get_llm(model_name: Optional[str] = None, json_mode: bool = True, timeout: float = 180.0, db: Any = None):
    """Get the active Chat LLM instance via Unified LLM Factory."""
    return get_chat_llm(model_name=model_name, json_mode=json_mode, timeout=timeout, db=db)


async def _update_progress(config: Optional[RunnableConfig], step: str, percent: int):
    """Helper to dispatch progress updates to the callback in RunnableConfig metadata."""
    if not config:
        return
    metadata = {}
    if hasattr(config, "get"):
        metadata = config.get("metadata", {})
    elif hasattr(config, "metadata"):
        metadata = config.metadata or {}
    
    on_progress = metadata.get("on_progress") if isinstance(metadata, dict) else None
    if on_progress:
        try:
            if asyncio.iscoroutinefunction(on_progress):
                await on_progress(step, percent)
            else:
                await asyncio.to_thread(on_progress, step, percent)
            # Add a small delay so the user can see this step active in the UI
            await asyncio.sleep(1.5)
        except Exception as e:
            logger.error(f"[KYC Pipeline] Progress callback error: {e}")


# --- Pipeline Nodes ---
async def research_node(state: KYCState, config: Optional[RunnableConfig] = None) -> dict:
    """Node 1: Gather research data from web search and crawling."""
    logger.info(f"[KYC Pipeline] Research node: {state['company_name']}")
    await _update_progress(config, "fetching_web", 40)

    # Web search
    search_results = web_search_service.search_company(
        company_name=state["company_name"],
        website=state.get("website"),
    )

    # Pre-verify live availability of search result links
    if search_results.get("company_info"):
        search_results["company_info"] = await link_verifier_service.filter_and_verify_sources(
            search_results["company_info"], timeout=3.0
        )
    if search_results.get("news"):
        search_results["news"] = await link_verifier_service.filter_and_verify_sources(
            search_results["news"], timeout=3.0
        )

    # Crawl website if available
    website_content = None
    if state.get("website"):
        website_content = await web_crawler_service.crawl_website(state["website"])

    await _update_progress(config, "fetching_industry", 65)

    # Industry use cases search
    industry_use_cases = []
    if state.get("industry"):
        raw_use_cases = web_search_service.search_industry_use_cases(
            industry=state["industry"],
            customer_needs=state["customer_needs"],
            product=state.get("product"),
        )
        industry_use_cases = await link_verifier_service.filter_and_verify_sources(
            raw_use_cases, timeout=3.0
        )

    return {
        "search_results": search_results,
        "website_content": website_content,
        "industry_use_cases": industry_use_cases,
    }


async def analysis_node(state: KYCState, config: Optional[RunnableConfig] = None) -> dict:
    """Node 2: Sectional KYC Generation Pipeline with Native Structured Output."""
    logger.info(f"[KYC Pipeline] Sectional analysis node: {state['company_name']}")
    await _update_progress(config, "analyzing", 75)

    model_override = state.get("model_name")
    llm = get_llm(model_name=model_override, json_mode=True, timeout=240.0)

    try:
        result = await run_sectional_kyc_pipeline(
            state=state,
            llm=llm,
            config=config,
            update_progress_fn=_update_progress,
            clean_json_fn=_clean_and_parse_json,
        )
        return result
    except Exception as e:
        logger.error(f"[KYC Pipeline] Sectional generation failed: {e}")
        return {"error": f"AI analysis failed: {str(e)}"}


def build_kyc_graph() -> StateGraph:
    """Build the LangGraph KYC pipeline."""
    workflow = StateGraph(KYCState)

    # Add nodes
    workflow.add_node("research", research_node)
    workflow.add_node("analysis", analysis_node)

    # Set entry point
    workflow.set_entry_point("research")

    # Add edges
    workflow.add_edge("research", "analysis")
    workflow.add_edge("analysis", END)

    return workflow.compile()


# --- Main Pipeline Runner ---
async def run_kyc_pipeline(
    company_name: str,
    customer_needs: str,
    website: Optional[str] = None,
    industry: Optional[str] = None,
    product: Optional[str] = None,
    additional_notes: Optional[str] = None,
    on_progress: Optional[Callable[[str, int], Any]] = None,
    opportunity_id: Optional[str] = None,
    user_id: Optional[str] = None,
    kyc_version: int = 1,
    source_type: str = "automatic",
    focus_notes: Optional[str] = None,
    model_name: Optional[str] = None,
) -> dict[str, Any]:
    """Run the full KYC pipeline and return the report data.

    Returns a dict with all KYC sections or an error.
    """
    logger.info(f"[KYC Pipeline] Starting KYC for: {company_name} (v{kyc_version} - {source_type}) [model={model_name or 'default'}]")

    if not has_active_llm_key():
        return {
            "error": "No LLM API Key (OPENAI_API_KEY or GEMINI_API_KEY) configured",
            "status": "failed",
        }

    initial_state: KYCState = {
        "company_name": company_name,
        "website": website,
        "industry": industry,
        "customer_needs": customer_needs,
        "additional_notes": additional_notes,
        "product": product,
        "opportunity_id": opportunity_id,
        "user_id": user_id,
        "kyc_version": kyc_version,
        "source_type": source_type,
        "focus_notes": focus_notes,
        "model_name": model_name,
        "search_results": {},
        "website_content": None,
        "industry_use_cases": [],
        "executive_summary": "",
        "company_overview": {},
        "industry_analysis": "",
        "competitor_analysis": [],
        "business_model": "",
        "company_location": "",
        "customer_need_summary": "",
        "potential_pain_points": [],
        "use_cases": [],
        "meeting_objectives": [],
        "recommended_questions": {"business": [], "technical": []},
        "preparation_checklist": [],
        "references": [],
        "error": None,
    }

    try:
        graph = build_kyc_graph()
        config = {"metadata": {"on_progress": on_progress}} if on_progress else {}
        result = await graph.ainvoke(initial_state, config=config)

        if result.get("error"):
            return {"status": "failed", "error": result["error"]}

        return {
            "status": "completed",
            "executive_summary": result.get("executive_summary", ""),
            "company_overview": result.get("company_overview", {}),
            "industry_analysis": result.get("industry_analysis", ""),
            "competitor_analysis": result.get("competitor_analysis", []),
            "business_model": result.get("business_model", ""),
            "company_location": result.get("company_location", ""),
            "customer_need_summary": result.get("customer_need_summary", ""),
            "potential_pain_points": result.get("potential_pain_points", []),
            "use_cases": result.get("use_cases", []),
            "meeting_objectives": result.get("meeting_objectives", []),
            "recommended_questions": result.get("recommended_questions", {"business": [], "technical": []}),
            "preparation_checklist": result.get("preparation_checklist", []),
            "references": result.get("references", []),
            "model_name": model_name,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as e:
        logger.error(f"[KYC Pipeline] Pipeline failed: {e}")
        return {"status": "failed", "error": str(e)}