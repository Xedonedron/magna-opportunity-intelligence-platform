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
from app.core.llm import get_chat_llm, has_active_llm_key
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
    competitor_analysis: list[dict]
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
## Profil Perusahaan & Katalog Solusi PT Smartnet Magna Global
Anda mewakili PT Smartnet Magna Global (SMG), penyedia solusi dan konsultan IT enterprise terkemuka yang berspesialisasi dalam:
1. Google Cloud Infrastructure & Modernization (GCP, GKE, Serverless, Cloud Migration)
2. Data Analytics & AI (BigQuery, Looker, Vertex AI, Predictive/Generative AI)
3. Cybersecurity Suite (Zero Trust, Cloud Security, SIEM, SOC, Penetration Testing)
4. Network Solutions (SD-WAN, Enterprise Networking, SASE)
5. Managed Services & Support
"""

    # Generate comprehensive KYC report
    prompt = f"""Anda adalah seorang Principal Business Analyst dan Enterprise Solutions Consultant yang sedang menyusun laporan intelijen KYC (Know Your Customer) komprehensif untuk persiapan meeting presales engineering di PT Smartnet Magna Global.

## Informasi Perusahaan Klien
- Nama Perusahaan: {state['company_name']}
- Website: {state.get('website', 'N/A')}
- Industri: {state.get('industry', 'N/A')}
- Target Solusi / Produk: {state.get('product', 'N/A')}

## Kebutuhan Klien (Customer Needs dari LGO/Sales)
{state['customer_needs']}

## Catatan Tambahan
{state.get('additional_notes', 'None')}

## Data Riset & Intelijen Eksternal
{context}
{use_cases_context}
{solutions_context}

---

INSTRUKSI BAHASA:
Seluruh teks narasi, ringkasan eksekutif, deskripsi, analisis industri, analisis kompetitor, use cases, tujuan meeting, rekomendasi pertanyaan, dan checklist persiapan WAJIB ditulis dalam Bahasa Indonesia yang formal, profesional, dan komprehensif (standar B2B enterprise presales). Tetap pertahankan istilah teknis standar industri IT/Cloud dalam bahasa Inggris yang umum digunakan (misal: "Cloud Migration", "Data Warehouse", "BigQuery", "Predictive AI", "Dashboard", "Workload", "Zero Trust", "API").

CRITICAL ALIGNMENT INSTRUCTION: Seluruh laporan yang dihasilkan (termasuk executive_summary, customer_need_summary, use_cases, recommended_questions, potential_pain_points, dan meeting_objectives) HARUS selaras secara ketat dengan "Kebutuhan Klien" dan "Target Solusi / Produk" di atas. Sesuaikan konteks riset industri untuk menyelesaikan kebutuhan nyata klien (misal: jika klien membutuhkan visualisasi/dashboard/reporting analitik, fokuskan use case pada modernisasi data warehouse, KPI dashboard, dan pipeline data, bukan hal yang tidak relevan).

CRITICAL LINK INSTRUCTION: Untuk array "references", Anda HANYA BOLEH menyertakan URL nyata yang secara eksplisit tersedia pada bagian Data Riset di atas. DILARANG membuat, merekayasa, atau menebak URL.

PANDUAN SOLUSI & USE CASE: Saat menyusun use_cases, rujuk bagian Referensi Riset dan Katalog Solusi Smartnet Magna Global di atas. Masukkan solusi nyata dari katalog Smartnet Magna pada field "smartnet_solutions" dan produk Google Cloud pada field "google_products". Nilai "impact_level" harus salah satu dari: "High", "Medium", atau "Low".

Format output HARUS berupa JSON valid dengan struktur kunci (keys) persis berikut:
{{
    "executive_summary": "Ringkasan eksekutif 2-3 paragraf mengenai profil perusahaan, konteks bisnis, peluang kolaborasi, dan urgensi solusi",
    "company_overview": {{
        "name": "{state['company_name']}",
        "description": "Deskripsi singkat profil bisnis, fokus utama operasional, dan positioning pasar perusahaan",
        "founded": "Tahun pendirian jika diketahui (atau N/A)",
        "size": "Estimasi jumlah karyawan / skala perusahaan",
        "headquarters": "Lokasi kantor pusat / wilayah operasional utama",
        "key_products": ["Daftar produk, layanan, atau lini bisnis utama perusahaan"]
    }},
    "industry_analysis": "Analisis mendalam mengenai lanskap industri, tren adopsi teknologi, regulasi/tantangan utama, dan peluang pertumbuhan pasar",
    "competitor_analysis": [
        {{
            "name": "Nama perusahaan kompetitor",
            "market_position": "Market Leader / Challenger / Niche Player / Kompetitor Utama",
            "strengths": ["Keunggulan kompetitif 1", "Keunggulan 2"],
            "weaknesses": ["Kelemahan atau celah pasar 1", "Kelemahan 2"],
            "differentiators": "Bagaimana target perusahaan bersaing atau membedakan diri dari kompetitor ini"
        }}
    ],
    "business_model": "Penjelasan bagaimana perusahaan menghasilkan pendapatan (revenue stream) dan menjalankan model operasional bisnisnya",
    "company_location": "Lokasi kantor pusat, fasilitas operasional, dan cakupan geografis pasar",
    "customer_need_summary": "Rangkuman komprehensif mengenai latar belakang kebutuhan, objektif teknis & bisnis klien berdasarkan data input dan riset",
    "potential_pain_points": ["Kendala operasional / teknis 1", "Pain point integrasi / infrastruktur 2", "Tantangan skalabilitas / keamanan 3"],
    "use_cases": [
        {{
            "title": "Judul use case / skenario solusi",
            "description": "Deskripsi singkat implementasi use case",
            "problem_solved": "Masalah spesifik yang diselesaikan oleh solusi ini",
            "how_it_works": "Bagaimana arsitektur dan alur kerja solusi ini diimplementasikan",
            "business_impact": "Dampak bisnis terukur, efisiensi biaya, atau percepatan time-to-market",
            "google_products": ["Produk Google Cloud yang relevan (misal: BigQuery, Vertex AI, GKE)"],
            "smartnet_solutions": ["Solusi spesifik dari katalog Smartnet Magna"],
            "impact_level": "High"
        }}
    ],
    "meeting_objectives": ["Tujuan strategis meeting 1", "Tujuan teknis meeting 2", "Target kesepakatan langkah berikutnya (Next Steps)"],
    "recommended_questions": ["Pertanyaan discovery kebutuhan bisnis 1", "Pertanyaan pendalaman arsitektur teknis 2", "Pertanyaan terkait timeline & budget 3", "Pertanyaan kriteria keberhasilan proyek 4", "Pertanyaan pengambil keputusan 5"],
    "preparation_checklist": ["Item persiapan presentasi / demo teknis 1", "Dokumen / proposal referensi yang perlu disiapkan 2", "Pemeriksaan arsitektur atau studi kasus relevan 3"],
    "references": [
        {{"title": "Judul artikel / referensi", "url": "URL sumber valid dari riset data", "type": "website/news/linkedin"}}
    ]
}}

Kembalikan HANYA JSON yang valid, tanpa teks pengantar atau penutup di luar JSON."""

    # Attempt invoke with auto-retry
    max_retries = 3
    last_error: Optional[Exception] = None
    result: dict = {}

    for attempt in range(1, max_retries + 1):
        try:
            current_prompt = prompt
            if attempt > 1 and last_error:
                # Feedback loop on retry to steer LLM to strictly correct syntax
                current_prompt += (
                    f"\n\nCRITICAL FIX: Your previous attempt failed JSON parsing with error: '{str(last_error)}'. "
                    "Ensure you escape all double quotes inside string values and output 100% valid, complete RFC8259 JSON."
                )
            response = await llm.ainvoke(current_prompt)
            result = _clean_and_parse_json(response.content)
            break
        except (json.JSONDecodeError, ValueError) as e:
            last_error = e
            logger.warning(f"[KYC Pipeline] Attempt {attempt}/{max_retries} failed to parse JSON: {e}")
            if attempt == max_retries:
                logger.error(f"[KYC Pipeline] All {max_retries} JSON parsing attempts failed: {e}")
                return {"error": f"Failed to parse AI response after {max_retries} attempts: {str(e)}"}
        except Exception as e:
            logger.error(f"[KYC Pipeline] LLM invocation failed on attempt {attempt}: {e}")
            return {"error": f"AI analysis failed: {str(e)}"}

    try:
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
            "competitor_analysis": result.get("competitor_analysis", []),
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

    except Exception as e:
        logger.error(f"[KYC Pipeline] Reference sanitation failed: {e}")
        return {"error": f"AI post-processing failed: {str(e)}"}


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
            "competitor_analysis": result.get("competitor_analysis", []),
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