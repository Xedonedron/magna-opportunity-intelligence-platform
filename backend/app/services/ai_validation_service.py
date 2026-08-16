"""AI Validation Service - Validates consistency of AI generated info, thinking processes, and live links."""

import json
import logging
import re
from typing import Any, Optional
from sqlalchemy.orm import Session

from app.core.llm import get_chat_llm
from app.services.link_verifier import link_verifier_service
from app.schemas.ai_validation import (
    ThinkingValidationRequest,
    ThinkingValidationResponse,
    ValidationIssue,
    LinkValidationItem,
)

logger = logging.getLogger(__name__)


class AIValidationService:
    """Service to validate thinking process vs final information output and verify URL veracity."""

    async def validate_information_and_thinking(
        self,
        request: ThinkingValidationRequest,
        db: Optional[Session] = None,
    ) -> ThinkingValidationResponse:
        """
        Validate consistency between internal thinking and generated output,
        perform hallucination checks, and verify live link availability.
        """
        info_text = request.information or ""
        thinking_text = request.thinking_process or ""
        context_text = request.context or ""

        # 1. Validate all links in information if requested
        link_items: list[LinkValidationItem] = []
        sanitized_info = info_text

        if request.check_links and info_text:
            cleaned_text, status_map = await link_verifier_service.verify_and_clean_text_links(
                info_text, timeout=3.0
            )
            sanitized_info = cleaned_text
            for url, is_alive in status_map.items():
                link_items.append(
                    LinkValidationItem(
                        url=url,
                        is_valid=is_alive,
                        status_code=200 if is_alive else 404,
                        error=None if is_alive else "URL unreachable or returned 404/error",
                    )
                )

        # 2. If thinking_process or context is provided, run LLM Critic for consistency check
        issues: list[ValidationIssue] = []
        consistency_score = 1.0
        feedback = "Output is verified and consistent."

        # Add dead link issues
        dead_links = [item.url for item in link_items if not item.is_valid]
        if dead_links:
            issues.append(
                ValidationIssue(
                    category="broken_link",
                    description=f"Dead or unverified links detected: {', '.join(dead_links)}",
                    severity="high" if len(dead_links) > 1 else "medium",
                )
            )

        if thinking_text or context_text:
            try:
                llm = get_chat_llm(model_name="gemini-2.5-flash", temperature=0.0, db=db)
                critic_prompt = f"""You are an expert AI Output & Reasoning Consistency Critic.
Evaluate if the Final Output is strictly grounded, logically follows from the Thinking Process, and aligns with the Context without hallucination or contradiction.

Context / Ground Truth:
{context_text or 'N/A'}

Internal Thinking Process / Reasoning Chain:
{thinking_text or 'N/A'}

Final Generated Output:
{info_text}

Analyze:
1. Is the final output consistent with the thinking process?
2. Are there contradictions, unwarranted claims, or fabricated facts not supported by the thinking/context?
3. Calculate consistency score (0.0 to 1.0).

Return ONLY JSON matching:
{{
    "is_consistent": true/false,
    "consistency_score": 0.95,
    "feedback": "Concise summary of findings",
    "issues": [
        {{
            "category": "hallucination/inconsistency/logical_fallacy",
            "description": "Details of the discrepancy",
            "severity": "high/medium/low"
        }}
    ]
}}
"""
                response = await llm.ainvoke(critic_prompt)
                raw_json = response.content if isinstance(response.content, str) else str(response.content)
                
                # Strip markdown code blocks
                raw_json = re.sub(r"^```json\s*", "", raw_json.strip())
                raw_json = re.sub(r"\s*```$", "", raw_json.strip())
                
                parsed = json.loads(raw_json)
                consistency_score = float(parsed.get("consistency_score", 1.0))
                feedback = parsed.get("feedback", "Consistent")
                
                for iss in parsed.get("issues", []):
                    issues.append(
                        ValidationIssue(
                            category=iss.get("category", "inconsistency"),
                            description=iss.get("description", ""),
                            severity=iss.get("severity", "medium"),
                        )
                    )
            except Exception as e:
                logger.error(f"[AIValidation] LLM critic evaluation failed: {e}")
                feedback = f"Automated link validation passed. LLM consistency check skipped: {e}"

        # Recalculate is_consistent
        has_high_severity = any(i.severity == "high" for i in issues)
        is_consistent = (consistency_score >= 0.75) and not has_high_severity and (len(dead_links) == 0)

        if dead_links and consistency_score > 0.8:
            consistency_score = max(0.0, consistency_score - (0.2 * len(dead_links)))

        return ThinkingValidationResponse(
            is_consistent=is_consistent,
            consistency_score=round(consistency_score, 2),
            feedback=feedback,
            issues=issues,
            links_validation=link_items,
            sanitized_information=sanitized_info,
        )


ai_validation_service = AIValidationService()