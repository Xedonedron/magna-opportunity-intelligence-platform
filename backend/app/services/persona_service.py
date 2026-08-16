"""Target Persona Playbook Generation Service using LLM."""

import json
import logging
import re
from typing import Any, Optional

from langchain_core.messages import SystemMessage, HumanMessage
from app.core.llm import get_chat_llm, has_active_llm_key

logger = logging.getLogger(__name__)


def _clean_and_parse_json(content: Any) -> dict:
    """Robust JSON parse from LLM response."""
    if isinstance(content, list):
        content = "".join([c.get("text", "") if isinstance(c, dict) else str(c) for c in content])
    if not content or not isinstance(content, str):
        raise ValueError("Empty response from AI model")

    text = content.strip()
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
    if fence_match:
        text = fence_match.group(1).strip()

    start_idx = text.find("{")
    end_idx = text.rfind("}")
    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        text = text[start_idx : end_idx + 1]

    text = re.sub(r",\s*([\}\]])", r"\1", text)
    return json.loads(text)


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
   - Sales: Pipeline acceleration, deal size, closing rate, revenue visibility.
   - IT: System reliability, architecture, API integration, security & data sovereignty, maintenance overhead.
   - Operations: SLA consistency, supply chain / process bottlenecks, error reduction, operational resilience.

Language Requirement:
Provide questions, notes, and value propositions in professional Indonesian (Bahasa Indonesia) with natural English enterprise tech terminology where standard.

Return ONLY valid JSON matching this exact structure:
{
  "focus_areas": [
    {
      "title": "Short title (e.g. Efisiensi Biaya Operasional)",
      "description": "Why this matters to this persona level and department"
    }
  ],
  "questions": [
    {
      "category": "Discovery / Pain Point / Strategic / Technical / Budget & Decision",
      "question": "The exact question to ask during the meeting",
      "purpose": "Why ask this question (objective/intent)"
    }
  ],
  "value_props": [
    "Key value proposition pitch point tailored for this role/department"
  ],
  "objection_handling": [
    {
      "objection": "Likely objection or hesitation this persona will bring up",
      "response": "Recommended talking point / response to address this objection"
    }
  ]
}
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
) -> dict:
    """Generate persona playbook using LLM."""
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

Please generate the comprehensive meeting playbook in JSON format. Provide 3-4 focus areas, 5-7 targeted discovery questions, 3-4 value proposition points, and 2-3 common objection handling strategies."""

    messages = [
        SystemMessage(content=PERSONA_SYSTEM_PROMPT),
        HumanMessage(content=user_prompt),
    ]

    try:
        response = await llm.ainvoke(messages)
        parsed = _clean_and_parse_json(response.content)
        return {
            "focus_areas": parsed.get("focus_areas", []),
            "questions": parsed.get("questions", []),
            "value_props": parsed.get("value_props", []),
            "objection_handling": parsed.get("objection_handling", []),
        }
    except Exception as e:
        logger.error(f"Failed to generate persona playbook: {e}", exc_info=True)
        raise RuntimeError(f"Gagal generate persona playbook: {str(e)}")