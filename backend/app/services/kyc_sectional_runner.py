"""Sectional KYC runner for modular 3-phase execution."""

import asyncio
import logging
from typing import Any, List, Optional
from langchain_core.runnables import RunnableConfig

from app.schemas.kyc import (
    CompanyProfileOutput,
    CompanyOverviewModel,
    IndustryCompetitorsOutput,
    CompetitorItem,
    PainPointsNeedsOutput,
    UseCasesOutput,
    EngagementStrategyOutput,
    ExecutiveSummaryOutput,
)
from app.services.kyc_invoker import invoke_section
from app.services.link_verifier import link_verifier_service
from app.core.solutions_catalog import solutions_catalog

logger = logging.getLogger(__name__)


def _build_base_context(state: Any) -> tuple:
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

    # Also get raw matched cards for case_study_url attachment & references injection
    _, matched_smg_cards = solutions_catalog.match_solutions_with_metadata(
        industry=state.get("industry"),
        product=state.get("product"),
        customer_needs=state.get("customer_needs"),
        focus_notes=state.get("focus_notes"),
        limit=6,
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
    return base, use_cases_context, solutions_context, matched_smg_cards


async def run_sectional_kyc_pipeline(
    state: Any,
    llm: Any,
    config: Optional[RunnableConfig],
    update_progress_fn: Any,
    clean_json_fn: Any,
) -> dict:
    base_context, use_cases_context, solutions_context, matched_smg_cards = _build_base_context(state)

    strict_json_directive = (
        "\n\nATURAN FORMAT OUTPUT (SANGAT KETAT - WAJIB DIPATUHI):\n"
        "1. Kembalikan HANYA teks JSON valid yang sesuai dengan skema yang diminta.\n"
        "2. JANGAN sertakan kalimat pengantar, basa-basi pembuka, atau penutup (misalnya: 'Berikut adalah...', 'Tentu, ini rancangan...', dll).\n"
        "3. JANGAN membungkus output dengan markdown code fence (```json ... ```). Mulai langsung dari '{' dan akhiri dengan '}'."
    )

    # --- Phase 1: Foundation Analysis (Check for Static Profile Reuse) ---
    existing_profile = state.get("existing_company_profile")
    reused_company_profile = False
    mod1: Optional[CompanyProfileOutput] = None
    mod2: Optional[IndustryCompetitorsOutput] = None

    if existing_profile and isinstance(existing_profile, dict):
        has_overview = bool(existing_profile.get("company_overview"))
        has_industry = bool(existing_profile.get("industry_analysis"))
        if has_overview and has_industry:
            try:
                mod1 = CompanyProfileOutput(
                    company_overview=existing_profile["company_overview"],
                    business_model=existing_profile.get("business_model") or "N/A",
                    company_location=existing_profile.get("company_location") or "N/A",
                )
                mod2 = IndustryCompetitorsOutput(
                    industry_analysis=existing_profile["industry_analysis"],
                    competitor_analysis=existing_profile.get("competitor_analysis") or [],
                )
                reused_company_profile = True
                logger.info(
                    "[KYC Pipeline] Phase 1: Reusing verified Company Profile & Industry Analysis for '%s'. Bypassing Module 1 & 2 LLM calls.",
                    state.get("company_name", "Unknown"),
                )
            except Exception as e:
                logger.warning(
                    "[KYC Pipeline] Failed to instantiate cached company profile, falling back to LLM generation: %s",
                    e,
                )
                reused_company_profile = False

    prompt_mod3 = f"""Analisis kebutuhan dan kendala operasional klien untuk Module 3: Customer Needs & Pain Points:
{base_context}

Struktur output JSON yang WAJIB:
- customer_need_summary: teks narasi ringkas kebutuhan bisnis dan teknis klien.
- potential_pain_points: array string kendala teknis / operasional ["kendala 1", "kendala 2"].
{strict_json_directive}"""

    if reused_company_profile and mod1 is not None and mod2 is not None:
        logger.info("[KYC Pipeline] Phase 1: Executing only Module 3 (Needs & Pain Points)...")
        mod3 = await invoke_section(
            llm,
            PainPointsNeedsOutput,
            prompt_mod3,
            "Module 3",
            max_retries=3,
            state=state,
            clean_json_fn=clean_json_fn,
        )
    else:
        logger.info("[KYC Pipeline] Phase 1: Foundation Analysis (Parallel Modules 1, 2, 3)...")
        prompt_mod1 = f"""Analisis data profil klien berikut dan hasilkan Module 1: Company Profile (company_overview, business_model, company_location).
Struktur output:
- company_overview: objek JSON berisi nama resmi (name), deskripsi bisnis (description), tahun berdiri (founded), ukuran perusahaan (size), kantor pusat (headquarters), dan daftar produk utama (key_products).
- business_model: teks narasi ringkas model bisnis dan revenue stream.
- company_location: teks narasi lokasi kantor pusat dan fasilitas operasional.

Data Profil:
{base_context}{strict_json_directive}"""
        prompt_mod2 = f"""Analisis industri dan kompetitor klien berikut untuk Module 2: Industry & Competitors:
{base_context}

Struktur output JSON yang WAJIB:
- industry_analysis: teks narasi ringkas lanskap dan tren industri klien.
- competitor_analysis: array objek [{{"name": "...", "market_position": "...", "strengths": [...], "weaknesses": [...], "differentiators": "..."}}].
{strict_json_directive}"""

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

ARSITEKTUR DECISION RULES (WAJIB DIPATUHI):
- On-Premise Compute/Storage: Dell Technologies, HPE, Nutanix, VMware, Sangfor. JANGAN gunakan BigQuery/Vertex AI untuk permintaan server fisik kecuali hybrid/cloud migration diminta.
- Campus LAN/WiFi: Cisco Catalyst, Aruba (HPE Networking), Huawei, Extreme Networks. JANGAN campur dengan SecOps/cloud warehouse.
- Cybersecurity: BeyondTrust PAM/EPM, Fortinet FortiGate, CrowdStrike, Google SecOps/Chronicle.
- Cloud Data Pipeline/ETL: BigQuery untuk SQL ELT, Dataflow untuk streaming, Dataproc untuk Spark OSS, Cloud Composer untuk DAG orchestration.
- AI/ML: Vertex AI, Gemini, BigQuery ML.

Struktur output JSON yang WAJIB (use_cases adalah array):
{{
  "use_cases": [
    {{
      "title": "Judul use case arsitektural",
      "description": "Deskripsi singkat implementasi",
      "problem_solved": "Masalah spesifik yang diselesaikan",
      "how_it_works": "Arsitektur teknis dan alur integrasi solusi",
      "business_impact": "Dampak bisnis terukur / ROI / efisiensi operasional",
      "google_products": ["Produk vendor / teknologi"],
      "smartnet_solutions": ["Solusi resmi Smartnet Magna Global"],
      "impact_level": "High"
    }}
  ]
}}
{strict_json_directive}
"""
    prompt_mod5 = f"""Susun strategi engagement dan discovery questions presales (Module 5):
{base_context}
Needs: {mod3.customer_need_summary}
Pain points: {', '.join(mod3.potential_pain_points)}

INSTRUKSI PENTING untuk recommended_questions:
Bagi discovery questions menjadi dua kategori:
- "business": Pertanyaan untuk C-Level / Business Owner / VP — fokus pada business driver, ROI, cost of inaction, timeline regulasi, target revenue/efisiensi, pain point operasional bisnis.
- "technical": Pertanyaan untuk CTO / IT Manager / DevOps / SecOps / Architect — fokus pada arsitektur eksisting, volume data/throughput, integrasi API/IAM, kendala migrasi teknis, stack teknologi, security posture.
Masing-masing kategori minimal 3-5 pertanyaan.

Struktur output JSON yang WAJIB:
{{
  "meeting_objectives": ["Objektif 1", "Objektif 2"],
  "recommended_questions": {{
    "business": ["Pertanyaan bisnis 1", "Pertanyaan bisnis 2"],
    "technical": ["Pertanyaan teknis 1", "Pertanyaan teknis 2"]
  }},
  "preparation_checklist": ["Checklist persiapan 1", "Checklist persiapan 2"]
}}
{strict_json_directive}
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

Struktur output JSON yang WAJIB:
{{
  "executive_summary": "Teks narasi Executive Summary 2-3 paragraf komprehensif..."
}}
{strict_json_directive}
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

    # Inject matched SMG solution cards as official case study references
    for card in matched_smg_cards:
        if card.source_url:
            raw_refs.append({
                "title": card.title,
                "url": card.source_url,
                "category": "Solusi Resmi & Case Study SMG",
            })

    verified_refs = await link_verifier_service.sanitize_references_and_sources(raw_refs, search_results=search, timeout=3.0)

    # Build lookup of verified SMG URLs for case_study attachment
    verified_smg_urls = {r["url"] for r in verified_refs if r.get("category") == "Solusi Resmi & Case Study SMG"}

    # Post-process use cases: attach case_study_url from matched SMG cards
    use_case_dicts = []
    for uc in mod4.use_cases:
        uc_dict = uc.model_dump()
        # Match by product overlap between use case and SMG cards
        uc_products = set(p.lower() for p in (uc_dict.get("google_products") or []))
        best_card = None
        best_overlap = 0
        for card in matched_smg_cards:
            if card.source_url not in verified_smg_urls:
                continue
            card_products = set(p.lower() for p in card.primary_products + card.all_products)
            overlap = len(uc_products & card_products)
            if overlap > best_overlap:
                best_overlap = overlap
                best_card = card
        if best_card:
            uc_dict["case_study_url"] = best_card.source_url
            uc_dict["case_study_title"] = best_card.title

        use_case_dicts.append(uc_dict)

    impact_order = {"High": 0, "Medium": 1, "Low": 2}
    sorted_use_cases = sorted(
        use_case_dicts,
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
        "recommended_questions": mod5.recommended_questions.model_dump(),
        "preparation_checklist": mod5.preparation_checklist,
        "references": verified_refs,
        "reused_company_profile": reused_company_profile,
    }
