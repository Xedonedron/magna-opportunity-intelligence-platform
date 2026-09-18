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
            res = None
            runnable = None

            # Prepare prompt with dynamic error feedback if retrying
            current_prompt = prompt
            if attempt > 1 and last_error:
                err_summary = str(last_error)
                if len(err_summary) > 200:
                    err_summary = err_summary[:200] + "..."
                corrective_header = (
                    f"### PERINGATAN PERBAIKAN FORMAT (PERCOBAAN {attempt}/{max_retries}):\n"
                    f"Upaya sebelumnya GAGAL divalidasi karena error: {err_summary}\n"
                    "Alasan: Model mengembalikan format teks narasi, tabel markdown, atau teks bebas non-JSON.\n"
                    "INSTRUKSI WAJIB DIPATUHI:\n"
                    "1. Kembalikan HANYA dokumen JSON valid yang sesuai dengan skema yang diminta.\n"
                    "2. Mulai respons langsung dengan '{' dan akhiri dengan '}'.\n"
                    "3. DILARANG KERAS menyertakan kalimat pengantar ('Berikut adalah...', 'Tentu...'), penjelasan, atau format tabel markdown (| col | col |).\n"
                    "4. Seluruh isi jawaban harus berada di dalam struktur field JSON yang diminta.\n\n"
                )
                current_prompt = corrective_header + prompt

            if hasattr(llm, "with_structured_output"):
                try:
                    runnable = llm.with_structured_output(schema_cls)
                except Exception as ex:
                    logger.warning(f"[KYC Section] with_structured_output setup failed for {section_name}: {ex}")
                    runnable = None

            if runnable is not None:
                try:
                    parsed_res = await runnable.ainvoke(current_prompt)
                    if isinstance(parsed_res, schema_cls):
                        res = parsed_res
                    elif isinstance(parsed_res, dict):
                        res = schema_cls.model_validate(parsed_res)
                    elif isinstance(parsed_res, list) and hasattr(schema_cls, "model_validate"):
                        res = schema_cls.model_validate(parsed_res)
                    elif clean_json_fn:
                        d = clean_json_fn(str(parsed_res))
                        res = schema_cls.model_validate(d)
                except Exception as structured_err:
                    recovered = False
                    raw_from_err = None

                    # 1. Try to extract raw input from Pydantic ValidationError
                    if hasattr(structured_err, "errors"):
                        try:
                            err_list = structured_err.errors()
                            if err_list and isinstance(err_list, list):
                                raw_from_err = err_list[0].get("input")
                        except Exception:
                            pass

                    # 2. Try to extract raw output from OutputParserException
                    if not raw_from_err and hasattr(structured_err, "llm_output"):
                        raw_from_err = getattr(structured_err, "llm_output")

                    # 3. Clean and parse if raw payload was extracted
                    if raw_from_err:
                        try:
                            logger.info(f"[KYC Section] Attempting auto-recovery from error payload for {section_name}...")
                            if isinstance(raw_from_err, str) and clean_json_fn:
                                d = clean_json_fn(raw_from_err)
                                res = schema_cls.model_validate(d)
                                recovered = True
                            elif isinstance(raw_from_err, (dict, list)):
                                res = schema_cls.model_validate(raw_from_err)
                                recovered = True
                            if recovered:
                                logger.info(f"[KYC Section] Successfully auto-recovered {section_name} via clean_json_fn!")
                        except Exception as rec_err:
                            logger.debug(f"[KYC Section] Error payload recovery failed: {rec_err}")

                    if not recovered:
                        logger.warning(
                            f"[KYC Section] with_structured_output failed for {section_name}: {structured_err}. Falling back to standard LLM call..."
                        )

            # Fallback to direct raw invocation if structured output was unavailable or unrecoverable
            if res is None:
                raw = await llm.ainvoke(current_prompt)
                raw_text = raw.content if hasattr(raw, "content") else str(raw)
                d = clean_json_fn(raw_text) if clean_json_fn else {}
                res = schema_cls.model_validate(d)

            dur = int((time.time() - start_ts) * 1000)

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
