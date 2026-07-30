"""AI KYC Pipeline using LangGraph for orchestrated KYC report generation."""

import json
import logging
from datetime import datetime, timezone
from typing import Any, Optional, TypedDict

from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END

from app.core.config import settings
from app.services.web_search_service import web_search_service
from app.services.web_crawler_service import web_crawler_service
from app.services.rag_service import rag_service

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
    smartnet_solutions: list

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


# --- LLM Setup ---
def get_llm() -> ChatOpenAI:
    """Get the OpenAI Compatible LLM instance (DeepSeek via CosmosHub)."""
    return ChatOpenAI(
        model=settings.OPENAI_MODEL,
        temperature=0.3,
        api_key=settings.OPENAI_API_KEY,
        base_url=settings.OPENAI_API_BASE,
    )


# --- Pipeline Nodes ---
async def research_node(state: KYCState) -> dict:
    """Node 1: Gather research data from web search and crawling."""
    logger.info(f"[KYC Pipeline] Research node: {state['company_name']}")

    # Web search
    search_results = web_search_service.search_company(
        company_name=state["company_name"],
        website=state.get("website"),
    )

    # Crawl website if available
    website_content = None
    if state.get("website"):
        website_content = await web_crawler_service.crawl_website(state["website"])

    # Industry use cases search
    industry_use_cases = []
    if state.get("industry"):
        industry_use_cases = web_search_service.search_industry_use_cases(
            industry=state["industry"],
            customer_needs=state["customer_needs"],
        )

    return {
        "search_results": search_results,
        "website_content": website_content,
        "industry_use_cases": industry_use_cases,
    }


async def solutions_node(state: KYCState) -> dict:
    """Node 2: Retrieve relevant Smartnet Magna internal solutions."""
    logger.info(f"[KYC Pipeline] Solutions node: {state['company_name']}")
    
    # Build query from customer needs and industry
    query_parts = []
    if state.get("customer_needs"):
        query_parts.append(state["customer_needs"])
    if state.get("industry"):
        query_parts.append(state["industry"])
    if state.get("product"):
        query_parts.append(state["product"])
    
    query = " ".join(query_parts) if query_parts else "IT solutions Google Cloud cybersecurity"
    
    # Retrieve Smartnet solutions
    smartnet_solutions = rag_service.query_solutions(
        query=query,
        industry_filter=state.get("industry"),
    )
    
    return {
        "smartnet_solutions": smartnet_solutions,
    }


async def analysis_node(state: KYCState) -> dict:
    """Node 3: Analyze research data and generate KYC sections using LLM."""
    logger.info(f"[KYC Pipeline] Analysis node: {state['company_name']}")

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

    # Build Smartnet Magna solutions context from RAG
    smartnet_solutions = state.get("smartnet_solutions", [])
    solutions_context = ""
    if smartnet_solutions:
        solutions_lines = ["\n## Smartnet Magna Solutions Catalog (from internal documents):"]
        for i, sol in enumerate(smartnet_solutions[:5], 1):
            solutions_lines.append(f"{i}. {sol.get('content', '')[:400]}")
        solutions_context = "\n".join(solutions_lines)

    # Generate comprehensive KYC report
    prompt = f"""You are an expert business analyst preparing a KYC (Know Your Customer) report for a presales engineering meeting at PT Smartnet Magna Global (an IT solutions company specializing in Google Cloud, cybersecurity, and enterprise AI).

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
        content = response.content

        # Clean markdown code blocks if present
        if content.startswith("```"):
            content = content.split("\n", 1)[1]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

        result = json.loads(content)

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
            "references": result.get("references", []),
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
    workflow.add_node("solutions", solutions_node)
    workflow.add_node("analysis", analysis_node)

    # Set entry point
    workflow.set_entry_point("research")

    # Add edges
    workflow.add_edge("research", "solutions")
    workflow.add_edge("solutions", "analysis")
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
) -> dict[str, Any]:
    """Run the full KYC pipeline and return the report data.

    Returns a dict with all KYC sections or an error.
    """
    logger.info(f"[KYC Pipeline] Starting KYC for: {company_name}")

    if not settings.OPENAI_API_KEY:
        return {
            "error": "OPENAI_API_KEY not configured",
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
        "smartnet_solutions": [],
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
        result = await graph.ainvoke(initial_state)

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