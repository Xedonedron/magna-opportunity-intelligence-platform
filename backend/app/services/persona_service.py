"""Target Persona Playbook Generation Service using LLM with Structured Output."""

import asyncio
import logging
import uuid
from typing import Optional

from langchain_core.messages import SystemMessage, HumanMessage
from app.core.llm import get_chat_llm, has_active_llm_key
from app.schemas.persona import PersonaPlaybookOutput
from app.services.ai_usage_service import record_ai_usage, estimate_tokens

logger = logging.getLogger(__name__)

PERSONA_SYSTEM_PROMPT = """You are a Principal Enterprise Presales & B2B Strategy Consultant at Magna.
Your job is to generate an in-depth, tactical meeting playbook tailored specifically to a target stakeholder's Seniority Level and Department.

Focus on creating highly relevant, consultative questions and value positioning that fit both:
1. Seniority Level:
   - Staff: Focus on day-to-day usability, tooling pains, technical steps, operational friction.
   - Manager/Head: Focus on process bottlenecks, SLA/KPI metrics, team productivity, cost efficiency, implementation timelines.
   - VP/Director/C-Level: Focus on business impact, strategic ROI, risk mitigation, compliance, top-line/bottom-line growth.
2. Department:
   - Finance: Cost justification, payback period, OPEX vs CAPEX, financial reporting accuracy.
   - HR: Employee retention, change management, training burden, talent productivity.
   - Marketing: Lead velocity, brand positioning, customer acquisition cost, conversion.
   - IT: System reliability, architecture, API integration, security & data sovereignty, maintenance overhead.
   - Operations: SLA consistency, supply chain / process bottlenecks, error reduction, operational resilience.
   - Custom / Other roles: Deeply analyze role context and business domain to deliver tailored consultative intelligence.

Language Requirement:
Provide questions, notes, and value propositions in professional Indonesian (Bahasa Indonesia) with natural English enterprise tech terminology where standard.
"""


async def generate_persona_playbook(
    company_name: str,
    industry: Optional[str],
    product: Optional[str],
    customer_needs: str,
    additional_notes: Optional[str],
    seniority: str,
    department: str,
    kyc_summary: Optional[str] = None,
    opportunity_id: Optional[uuid.UUID] = None,
    user_id: Optional[uuid.UUID] = None,
) -> dict:
    """Generate persona playbook using LLM with structured output."""
    if not has_active_llm_key():
        # Fallback stub if no LLM key configured
        return {
            "focus_areas": [
                {
                    "title": f"Prioritas {department} ({seniority})",
                    "description": f"Fokus pada efisiensi kerja, mitigasi risiko, dan pencapaian target divisi {department}.",
                }
            ],
            "questions": [
                {
                    "category": "Discovery",
                    "question": f"Bagaimana divisi {department} saat ini menangani kebutuhan {product or 'solusi'} yang sedang berjalan?",
                    "purpose": "Memahami baseline proses dan pain point saat ini.",
                },
                {
                    "category": "Strategic",
                    "question": f"Dari kacamata level {seniority}, apa metrik keberhasilan utama yang ingin dicapai dalam 6-12 bulan ke depan?",
                    "purpose": "Menyelaraskan solusi dengan KPI pemegang keputusan.",
                },
            ],
            "value_props": [
                f"Solusi terintegrasi untuk mempercepat operasional {department} dengan transparansi penuh.",
                "Implementasi bertahap tanpa mengganggu workflow harian tim.",
            ],
            "objection_handling": [
                {
                    "objection": "Apakah implementasi solusi ini membutuhkan waktu adaptasi yang lama bagi tim kami?",
                    "response": "Kami menyediakan onboarding terstruktur dan pendampingan teknis intensif sehingga tim bisa langsung produktif dalam hitungan minggu.",
                }
            ],
        }

    llm = get_chat_llm(temperature=0.3)
    structured_llm = llm.with_structured_output(PersonaPlaybookOutput)

    user_prompt = f"""Target Opportunity Context:
- Company Name: {company_name}
- Industry: {industry or 'General Industry'}
- Target Solution / Product: {product or 'Enterprise IT Solution'}
- Customer Needs & Pain Points: {customer_needs}
- Additional Notes: {additional_notes or 'None'}
- KYC Context / Company Overview: {kyc_summary or 'None'}

Target Stakeholder to Meet:
- Seniority Level: {seniority}
- Department: {department}

Please generate the comprehensive meeting playbook. Provide 3-4 focus areas, 5-7 targeted discovery questions, 3-4 value proposition points, and 2-3 common objection handling strategies."""

    messages = [
        SystemMessage(content=PERSONA_SYSTEM_PROMPT),
        HumanMessage(content=user_prompt),
    ]

    max_retries = 3
    last_error: Optional[Exception] = None

    for attempt in range(1, max_retries + 1):
        try:
            current_messages = list(messages)
            if attempt > 1 and last_error:
                current_messages.append(
                    HumanMessage(
                        content=f"Previous attempt encountered an issue: '{str(last_error)}'. Please provide all structured fields fully populated."
                    )
                )

            result = await structured_llm.ainvoke(current_messages)
            if isinstance(result, PersonaPlaybookOutput):
                parsed = result.model_dump()
            elif isinstance(result, dict):
                parsed = result
            elif hasattr(result, "model_dump"):
                parsed = result.model_dump()
            elif hasattr(result, "dict"):
                parsed = result.dict()
            else:
                parsed = {}

            p_tokens = estimate_tokens(user_prompt)
            c_tokens = estimate_tokens(str(parsed))
            model_name = getattr(llm, "model_name", None) or getattr(llm, "model", None) or "ai-model"
            provider = "google" if "google" in llm.__class__.__name__.lower() else "openai"

            record_ai_usage(
                db=None,
                user_id=user_id,
                opportunity_id=opportunity_id,
                feature="persona_generation",
                model_name=str(model_name),
                provider=provider,
                prompt_tokens=int(p_tokens),
                completion_tokens=int(c_tokens),
                query_prompt=f"Persona Discovery: {seniority} - {department} for {company_name}",
                response_preview=str(parsed)[:1000] if parsed else None,
                status="success",
            )

            return {
                "focus_areas": parsed.get("focus_areas", []),
                "questions": parsed.get("questions", []),
                "value_props": parsed.get("value_props", []),
                "objection_handling": parsed.get("objection_handling", []),
            }
        except Exception as e:
            last_error = e
            logger.warning(f"[Persona Service] Structured output invocation failed on attempt {attempt}/{max_retries}: {e}")
            if attempt < max_retries:
                await asyncio.sleep(2.0 * attempt)
            else:
                logger.error(f"Failed to generate persona playbook after {max_retries} attempts: {e}", exc_info=True)
                raise RuntimeError(f"Gagal generate persona playbook: {str(e)}")
