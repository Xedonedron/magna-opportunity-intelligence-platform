# Section runner helper
import asyncio
import logging
import time
from typing import Any, Optional, Type, TypeVar
from pydantic import BaseModel

logger = logging.getLogger(__name__)
T = TypeVar("T", bound=BaseModel)

async def invoke_section(
    llm: Any,
    schema_cls: Type[T],
    prompt: str,
    section_name: str,
    max_retries: int = 3,
    state: Optional[dict] = None,
    clean_json_fn: Any = None,
) -> T:
    last_error = None
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"[KYC Section] Invoking {section_name} (attempt {attempt}/{max_retries})...")
            start_ts = time.time()
            runnable = None
            if hasattr(llm, "with_structured_output"):
                try:
                    runnable = llm.with_structured_output(schema_cls)
                except Exception as ex:
                    logger.warning(f"[KYC Section] with_structured_output failed for {section_name}: {ex}")
            if runnable is not None:
                parsed_res = await runnable.ainvoke(prompt)
                dur = int((time.time() - start_ts) * 1000)
                if isinstance(parsed_res, schema_cls):
                    res = parsed_res
                elif isinstance(parsed_res, dict):
                    res = schema_cls.model_validate(parsed_res)
                else:
                    d = clean_json_fn(str(parsed_res)) if clean_json_fn else {}
                    res = schema_cls.model_validate(d)
            else:
                raw = await llm.ainvoke(prompt)
                dur = int((time.time() - start_ts) * 1000)
                d = clean_json_fn(raw.content) if clean_json_fn else {}
                res = schema_cls.model_validate(d)

            # Record token usage non-blocking
            if state:
                try:
                    import uuid as py_uuid
                    from app.services.ai_usage_service import record_ai_usage, estimate_tokens
                    opp_uuid = py_uuid.UUID(state["opportunity_id"]) if state.get("opportunity_id") else None
                    usr_uuid = py_uuid.UUID(state["user_id"]) if state.get("user_id") else None
                    model_name = getattr(llm, "model_name", None) or getattr(llm, "model", None) or "ai-model"
                    provider = "google" if "google" in llm.__class__.__name__.lower() else "openai"
                    k_ver = state.get("kyc_version") or 1
                    s_type = state.get("source_type") or "automatic"
                    record_ai_usage(
                        db=None,
                        user_id=usr_uuid,
                        opportunity_id=opp_uuid,
                        feature="kyc_generation",
                        model_name=str(model_name),
                        provider=provider,
                        prompt_tokens=estimate_tokens(prompt),
                        completion_tokens=estimate_tokens(str(res.model_dump())),
                        query_prompt=f"KYC Section ({section_name} v{k_ver}) for {state.get('company_name')}",
                        response_preview=str(res.model_dump())[:500],
                        metadata_json={"kyc_version": k_ver, "source_type": s_type, "section": section_name},
                        duration_ms=dur,
                        status="success",
                    )
                except Exception as usage_err:
                    logger.debug(f"[KYC Section] Non-blocking usage logging exception: {usage_err}")

            return res
        except Exception as e:
            last_error = e
            logger.warning(f"[KYC Section] {section_name} failed on attempt {attempt}/{max_retries}: {e}")
            if attempt < max_retries:
                await asyncio.sleep(2.0 * attempt)
            else:
                logger.error(f"[KYC Section] All {max_retries} attempts failed for {section_name}: {e}")
                raise e
    raise last_error or RuntimeError(f"Section {section_name} failed")
