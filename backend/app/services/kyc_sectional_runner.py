"""Sectional KYC runner for modular 3-phase execution."""

import asyncio
import logging
from typing import Any, Optional
from langchain_core.runnables import RunnableConfig

from app.schemas.kyc import (
    CompanyProfileOutput,
    IndustryCompetitorsOutput,
    PainPointsNeedsOutput,
    UseCasesOutput,
    EngagementStrategyOutput,
    ExecutiveSummaryOutput,
)
from app.services.kyc_invoker import invoke_section
from app.services.link_verifier import link_verifier_service
from app.core.solutions_catalog import solutions_catalog

def _build_base_context(state: Any) -> tuple[str, str, str]:
    context_parts = []
    search = state.get("search_results", {})
    if search.get("company_answer"):
        context_parts.append(f"Company Summary: {search['company_answer']}")
    for result in search.get("company_info", [])[:3]:
        context_parts.append(f"- {result.get('title', '')}: {result.get('content', '')[:500]}")
    for result in search.get("news", [])[:3]:
        context_parts.append(f"News: {result.get('title', '')} - {result.get('content', '')[:300]}")

    website = state.get("website_content")
    if website:
        context_parts.append(f"\nWebsite Title: {website.get('title', '')}")
        context_parts.append(f"Website Description: {website.get('description', '')}")
        if website.get("headings"):
            context_parts.append(f"Website Sections: {', '.join(website['headings'][:5])}")
        content_preview = website.get("text_content", "")[:2000]
        context_parts.append(f"Website Content: {content_preview}")

    context = "\n".join(context_parts) if context_parts else "No external data found."

    industry_use_cases = state.get("industry_use_cases", [])
    use_cases_context = ""
    if industry_use_cases:
        lines = ["\n## Industry Use Cases Reference (from web search):"]
        for i, uc in enumerate(industry_use_cases[:5], 1):
            lines.append(f"{i}. {uc.get('title', 'N/A')}: {uc.get('content', '')[:300]}")
        use_cases_context = "\n".join(lines)

    solutions_context = solutions_catalog.get_solutions_for_prompt(
        industry=state.get("industry"),
        product=state.get("product"),
        customer_needs=state.get("customer_needs"),
        limit=4,
    )

    focus = f"\n## PANDUAN FOKUS KHUSUS (PRIORITAS TERTINGGI):\n{state['focus_notes']}\n" if state.get("focus_notes") else ""

    base = f"""## Informasi Perusahaan Klien
- Nama Perusahaan: {state['company_name']}
- Website: {state.get('website', 'N/A')}
- Industri: {state.get('industry', 'N/A')}
- Target Solusi / Produk: {state.get('product', 'N/A')}

## Kebutuhan Klien
{state['customer_needs']}

## Catatan Tambahan
{state.get('additional_notes', 'None')}
{focus}
## Data Riset & Intelijen Eksternal
{context}
"""
    return base, use_cases_context, solutions_context

logger = logging.getLogger(__name__)
async def run_sectional_kyc_pipeline(
    state: Any,
    llm: Any,
    config: Optional[RunnableConfig],
    update_progress_fn: Any,
    clean_json_fn: Any,
) -> dict:
    base_context, use_cases_context, solutions_context = _build_base_context(state)

    # --- Phase 1: Foundation Analysis (Parallel Modules 1-3) ---
    logger.info("[KYC Pipeline] Phase 1: Foundation Analysis (Modules 1, 2, 3)...")
    prompt_mod1 = f"Analisis data profil klien berikut dan hasilkan Module 1: Company Profile (company_overview, business_model, company_location):\n{base_context}"
    prompt_mod2 = f"Analisis industri dan kompetitor klien berikut untuk Module 2: Industry & Competitors (industry_analysis, competitor_analysis):\n{base_context}"
    prompt_mod3 = f"Analisis kebutuhan dan kendala operasional klien untuk Module 3: Customer Needs & Pain Points (customer_need_summary, potential_pain_points):\n{base_context}"

    mod1, mod2, mod3 = await asyncio.gather(
        invoke_section(llm, CompanyProfileOutput, prompt_mod1, "Module 1", max_retries=3, state=state, clean_json_fn=clean_json_fn),
        invoke_section(llm, IndustryCompetitorsOutput, prompt_mod2, "Module 2", max_retries=3, state=state, clean_json_fn=clean_json_fn),
        invoke_section(llm, PainPointsNeedsOutput, prompt_mod3, "Module 3", max_retries=3, state=state, clean_json_fn=clean_json_fn),
    )
    await update_progress_fn(config, "analyzing", 85)

    # --- Phase 2: Solutions & Engagement (Parallel Modules 4-5) ---
    logger.info("[KYC Pipeline] Phase 2: Presales Solutions & Engagement Strategy (Modules 4, 5)...")
    prompt_mod4 = f"""Susun 2-3 use cases presales arsitektural (Module 4) untuk Smartnet Magna Global:
{base_context}
{use_cases_context}
{solutions_context}
Needs: {mod3.customer_need_summary}
Pain Points: {', '.join(mod3.potential_pain_points)}
Pilar SMG: On-prem (Dell, HPE, Nutanix, Cisco), Network (Cisco, Aruba), Security (BeyondTrust, Fortinet, Palo Alto, SecOps), Cloud/Data (GCP, AWS).
"""
    prompt_mod5 = f"""Susun strategi engagement dan discovery questions presales (Module 5):
{base_context}
Needs: {mod3.customer_need_summary}
Pain points: {', '.join(mod3.potential_pain_points)}
"""
    mod4, mod5 = await asyncio.gather(
        invoke_section(llm, UseCasesOutput, prompt_mod4, "Module 4", max_retries=3, state=state, clean_json_fn=clean_json_fn),
        invoke_section(llm, EngagementStrategyOutput, prompt_mod5, "Module 5", max_retries=3, state=state, clean_json_fn=clean_json_fn),
    )
    await update_progress_fn(config, "analyzing", 93)

    # --- Phase 3: Ultimate Executive Summary (Module 6) ---
    logger.info("[KYC Pipeline] Phase 3: Executive Synthesis (Module 6)...")
    prompt_mod6 = f"""Tulis Executive Summary komprehensif 2-3 paragraf standar C-Level untuk klien ini:
Profil: {mod1.company_overview.name} - {mod1.company_overview.description}
Model Bisnis: {mod1.business_model}
Industri: {mod2.industry_analysis[:400]}
Needs: {mod3.customer_need_summary}
Pain points: {', '.join(mod3.potential_pain_points)}
Use Cases: {', '.join([u.title for u in mod4.use_cases])}
Target Meeting: {', '.join(mod5.meeting_objectives)}
"""
    mod6 = await invoke_section(llm, ExecutiveSummaryOutput, prompt_mod6, "Module 6", max_retries=3, state=state, clean_json_fn=clean_json_fn)

    # --- Phase 4: References Live Verification & Final Packaging ---
    search = state.get("search_results", {})
    raw_refs = []
    for item in search.get("company_info", []):
        if item.get("url"):
            raw_refs.append({"title": item.get("title") or "Company Profile Reference", "url": item["url"], "category": "Company Overview"})
    for item in search.get("news", []):
        if item.get("url"):
            raw_refs.append({"title": item.get("title") or "Industry News Reference", "url": item["url"], "category": "Industry News"})

    verified_refs = await link_verifier_service.sanitize_references_and_sources(raw_refs, search_results=search, timeout=3.0)

    impact_order = {"High": 0, "Medium": 1, "Low": 2}
    sorted_use_cases = sorted(
        [uc.model_dump() for uc in mod4.use_cases],
        key=lambda uc: impact_order.get(uc.get("impact_level", "Medium"), 99),
    )

    return {
        "executive_summary": mod6.executive_summary,
        "company_overview": mod1.company_overview.model_dump(),
        "industry_analysis": mod2.industry_analysis,
        "competitor_analysis": [c.model_dump() for c in mod2.competitor_analysis],
        "business_model": mod1.business_model,
        "company_location": mod1.company_location,
        "customer_need_summary": mod3.customer_need_summary,
        "potential_pain_points": mod3.potential_pain_points,
        "use_cases": sorted_use_cases,
        "meeting_objectives": mod5.meeting_objectives,
        "recommended_questions": mod5.recommended_questions,
        "preparation_checklist": mod5.preparation_checklist,
        "references": verified_refs,
    }

