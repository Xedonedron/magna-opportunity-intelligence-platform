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

    # 1. Extract markdown fence if present
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)(?:```|$)", text, re.IGNORECASE)
    if fence_match and fence_match.group(1).strip():
        text = fence_match.group(1).strip()

    # 2. Slice from first '{'
    start_idx = text.find("{")
    if start_idx != -1:
        text = text[start_idx:]

    # 3. Clean trailing commas
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

    # 6. Truncation self-healing
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

    # Attempt invoke with auto-retry
    max_retries = 3
    last_error: Optional[Exception] = None

    for attempt in range(1, max_retries + 1):
        try:
            current_messages = list(messages)
            if attempt > 1 and last_error:
                current_messages.append(
                    HumanMessage(
                        content=(
                            f"CRITICAL FIX: Your previous response failed JSON parsing with error: '{str(last_error)}'. "
                            "Return ONLY strictly valid, complete RFC8259 JSON without markdown fences or unescaped quotes."
                        )
                    )
                )
            response = await llm.ainvoke(current_messages)
            parsed = _clean_and_parse_json(response.content)
            return {
                "focus_areas": parsed.get("focus_areas", []),
                "questions": parsed.get("questions", []),
                "value_props": parsed.get("value_props", []),
                "objection_handling": parsed.get("objection_handling", []),
            }
        except (json.JSONDecodeError, ValueError) as e:
            last_error = e
            logger.warning(f"[Persona Service] Attempt {attempt}/{max_retries} failed to parse JSON: {e}")
            if attempt == max_retries:
                logger.error(f"[Persona Service] All {max_retries} JSON parsing attempts failed: {e}")
                raise RuntimeError(f"Gagal parse JSON persona playbook setelah {max_retries} percobaan: {str(e)}")
        except Exception as e:
            logger.error(f"Failed to generate persona playbook: {e}", exc_info=True)
            raise RuntimeError(f"Gagal generate persona playbook: {str(e)}")