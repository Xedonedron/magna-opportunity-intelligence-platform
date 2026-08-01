"""AI KYC Pipeline using LangGraph for orchestrated KYC report generation."""

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
from app.core.llm import get_chat_llm
from app.services.web_search_service import web_search_service
from app.services.web_crawler_service import web_crawler_service
from app.services.link_verifier import link_verifier_service

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

    # Intermediate results
    search_results: dict
    website_content: Optional[dict]
    industry_use_cases: list

    # Output sections
    executive_summary: str
    company_overview: dict
    industry_analysis: str
    business_model: str
    company_location: str
    customer_need_summary: str
    potential_pain_points: list[str]
    use_cases: list[dict]
    meeting_objectives: list[str]
    recommended_questions: list[str]
    preparation_checklist: list[str]
    references: list[dict]

    # Metadata
    error: Optional[str]


# --- Helper for robust JSON parsing ---
def _clean_and_parse_json(content: Any) -> dict:
    """Robustly clean and parse JSON output from LLM, fixing common formatting defects."""
    if isinstance(content, list):
        content = "".join([c.get("text", "") if isinstance(c, dict) else str(c) for c in content])
    if not content or not isinstance(content, str):
        raise ValueError("Empty response content from AI model")

    text = content.strip()

    # 1. If wrapped in markdown code fence, extract inside block
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
    if fence_match:
        text = fence_match.group(1).strip()

    # 2. Extract substring between first '{' and last '}'
    start_idx = text.find("{")
    end_idx = text.rfind("}")
    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        text = text[start_idx : end_idx + 1]

    # 3. Clean trailing commas inside arrays/objects (e.g. ", }", ", ]")
    text = re.sub(r",\s*([\}\]])", r"\1", text)

    # 4. Try parsing standard JSON
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # 5. Fallback: escape raw unescaped newlines/tabs inside string values
        fixed = re.sub(r'(?<!\\)\r?\n', r'\\n', text)
        fixed = re.sub(r'(?<!\\)\t', r'\\t', fixed)
        return json.loads(fixed)


# --- LLM Setup ---
def get_llm(db: Any = None):
    """Get the active Chat LLM instance via Unified LLM Factory."""
    return get_chat_llm(json_mode=True, db=db)


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
    """Node 3: Analyze research data and generate KYC sections using LLM."""
    logger.info(f"[KYC Pipeline] Analysis node: {state['company_name']}")
    await _update_progress(config, "analyzing", 85)

    llm = get_llm()

    # Build context from research
    context_parts = []

    # Add search results
    search = state.get("search_results", {})
    if search.get("company_answer"):
        context_parts.append(f"Company Summary: {search['company_answer']}")

    for result in search.get("company_info", [])[:3]:
        context_parts.append(f"- {result.get('title', '')}: {result.get('content', '')[:500]}")

    for result in search.get("news", [])[:3]:
        context_parts.append(f"News: {result.get('title', '')} - {result.get('content', '')[:300]}")

    # Add website content
    website = state.get("website_content")
    if website:
        context_parts.append(f"\nWebsite Title: {website.get('title', '')}")
        context_parts.append(f"Website Description: {website.get('description', '')}")
        if website.get("headings"):
            context_parts.append(f"Website Sections: {', '.join(website['headings'][:5])}")
        content_preview = website.get("text_content", "")[:2000]
        context_parts.append(f"Website Content: {content_preview}")

    context = "\n".join(context_parts) if context_parts else "No external data found."

    # Build industry use cases context
    industry_use_cases = state.get("industry_use_cases", [])
    use_cases_context = ""
    if industry_use_cases:
        use_cases_lines = ["\n## Industry Use Cases Reference (from web search):"]
        for i, uc in enumerate(industry_use_cases[:5], 1):
            use_cases_lines.append(f"{i}. {uc.get('title', 'N/A')}: {uc.get('content', '')[:300]}")
        use_cases_context = "\n".join(use_cases_lines)

    # Built-in Smartnet Magna Global Profile
    solutions_context = """
## Smartnet Magna Global Company Profile & Solutions Catalog
You are representing Smartnet Magna Global (SMG), a leading IT consulting and solutions provider specializing in:
1. Google Cloud Infrastructure & Modernization (GCP, GKE, Serverless, Cloud Migration)
2. Data Analytics & AI (BigQuery, Looker, Vertex AI, Predictive/Generative AI)
3. Cybersecurity Suite (Zero Trust, Cloud Security, SIEM, SOC, Penetration Testing)
4. Network Solutions (SD-WAN, Enterprise Networking, SASE)
5. Managed Services & Support
"""

    # Generate comprehensive KYC report
    prompt = f"""You are an expert business analyst preparing a KYC (Know Your Customer) report for a presales engineering meeting at PT Smartnet Magna Global.

## Company Information
- Company Name: {state['company_name']}
- Website: {state.get('website', 'N/A')}
- Industry: {state.get('industry', 'N/A')}
- Target Product: {state.get('product', 'N/A')}

## Customer Needs (from LGO)
{state['customer_needs']}

## Additional Notes
{state.get('additional_notes', 'None')}

## Research Data
{context}
{use_cases_context}
{solutions_context}

---

Generate a comprehensive KYC report in JSON format with the following structure. All text should be in English. Be specific and actionable.

CRITICAL ALIGNMENT INSTRUCTION: The entire generated report (including executive_summary, customer_need_summary, use_cases, recommended_questions, potential_pain_points, and meeting_objectives) MUST be strictly aligned with the "Customer Needs" and "Target Product" sections above. Adapt the industry research context (like general manufacturing use cases) to solve the customer's *actual* specified needs (e.g., if they ask for visualization/dashboards/reporting, do NOT focus use cases on predictive maintenance, IoT sensors, or hardware utilization just because they are in the Manufacturing industry; instead, focus on analytics dashboards, KPI reporting, and data migration for manufacturing).

CRITICAL LINK INSTRUCTION: For the "references" array, you MUST ONLY include real URLs explicitly provided in the Research Data section above. DO NOT invent, construct, or guess any URL.

IMPORTANT: When generating use_cases, reference the Industry Use Cases Reference and Smartnet Magna Solutions Catalog sections above. Use actual Smartnet Magna solutions from the catalog in the "smartnet_solutions" field of each use case.

{{
    "executive_summary": "2-3 paragraph executive summary of the company and opportunity",
    "company_overview": {{
        "name": "company name",
        "description": "brief company description",
        "founded": "year if known",
        "size": "employee count estimate",
        "headquarters": "location",
        "key_products": ["list of main products/services"]
    }},
    "industry_analysis": "Analysis of the industry landscape, trends, and challenges",
    "business_model": "How the company makes money and operates",
    "company_location": "Primary locations and operational footprint",
    "customer_need_summary": "Summary of what the customer needs based on the input and research",
    "potential_pain_points": ["pain point 1", "pain point 2", "pain point 3"],
    "use_cases": [
        {{
            "title": "Use case title",
            "description": "Brief description",
            "problem_solved": "What problem this solves",
            "how_it_works": "How the solution works",
            "business_impact": "Expected business impact",
            "google_products": ["relevant Google products"],
            "smartnet_solutions": ["relevant Smartnet Magna solutions from the catalog above"],
            "impact_level": "High/Medium/Low"
        }}
    ],
    "meeting_objectives": ["objective 1", "objective 2", "objective 3"],
    "recommended_questions": ["question 1", "question 2", "question 3", "question 4", "question 5"],
    "preparation_checklist": ["prep item 1", "prep item 2", "prep item 3"],
    "references": [
        {{"title": "source title", "url": "source url", "type": "website/news/linkedin"}}
    ]
}}

Return ONLY valid JSON, no markdown formatting."""

    try:
        response = await llm.ainvoke(prompt)
        result = _clean_and_parse_json(response.content)

        # Sanitize references via live LinkVerifier Engine
        raw_references = result.get("references", [])
        verified_references = await link_verifier_service.sanitize_references_and_sources(
            references=raw_references,
            search_results=state.get("search_results"),
            timeout=3.0,
        )

        return {
            "executive_summary": result.get("executive_summary", ""),
            "company_overview": result.get("company_overview", {}),
            "industry_analysis": result.get("industry_analysis", ""),
            "business_model": result.get("business_model", ""),
            "company_location": result.get("company_location", ""),
            "customer_need_summary": result.get("customer_need_summary", ""),
            "potential_pain_points": result.get("potential_pain_points", []),
            "use_cases": result.get("use_cases", []),
            "meeting_objectives": result.get("meeting_objectives", []),
            "recommended_questions": result.get("recommended_questions", []),
            "preparation_checklist": result.get("preparation_checklist", []),
            "references": verified_references,
        }

    except json.JSONDecodeError as e:
        logger.error(f"[KYC Pipeline] Failed to parse LLM response: {e}")
        return {"error": f"Failed to parse AI response: {str(e)}"}
    except Exception as e:
        logger.error(f"[KYC Pipeline] LLM analysis failed: {e}")
        return {"error": f"AI analysis failed: {str(e)}"}


# --- Graph Builder ---
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
) -> dict[str, Any]:
    """Run the full KYC pipeline and return the report data.

    Returns a dict with all KYC sections or an error.
    """
    logger.info(f"[KYC Pipeline] Starting KYC for: {company_name}")

    if not settings.OPENAI_API_KEY and not settings.active_gemini_api_key:
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
        "search_results": {},
        "website_content": None,
        "industry_use_cases": [],
        "executive_summary": "",
        "company_overview": {},
        "industry_analysis": "",
        "business_model": "",
        "company_location": "",
        "customer_need_summary": "",
        "potential_pain_points": [],
        "use_cases": [],
        "meeting_objectives": [],
        "recommended_questions": [],
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
            "business_model": result.get("business_model", ""),
            "company_location": result.get("company_location", ""),
            "customer_need_summary": result.get("customer_need_summary", ""),
            "potential_pain_points": result.get("potential_pain_points", []),
            "use_cases": result.get("use_cases", []),
            "meeting_objectives": result.get("meeting_objectives", []),
            "recommended_questions": result.get("recommended_questions", []),
            "preparation_checklist": result.get("preparation_checklist", []),
            "references": result.get("references", []),
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as e:
        logger.error(f"[KYC Pipeline] Pipeline failed: {e}")
        return {"status": "failed", "error": str(e)}