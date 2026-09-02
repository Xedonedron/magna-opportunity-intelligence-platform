import logging
from typing import Optional, Any
from sqlalchemy.orm import Session
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from google import genai
from app.core.config import settings

logger = logging.getLogger(__name__)


def get_db_setting(db: Optional[Session], key: str, default: Optional[str] = None) -> Optional[str]:
    close_db = False
    if db is None:
        try:
            from app.core.database import SessionLocal
            db = SessionLocal()
            close_db = True
        except Exception:
            return default
    try:
        from app.models.system_setting import SystemSetting
        row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if row and row.value is not None and row.value.strip():
            return row.value.strip()
    except Exception as e:
        logger.warning(f"[LLM Factory] Failed to read '{key}' from system_settings DB table: {e}")
    finally:
        if close_db and db:
            db.close()
    return default


def get_genai_client(api_key: Optional[str] = None, db: Optional[Session] = None) -> genai.Client:
    """
    Get a native Google GenAI SDK Client instance configured with active Google AI Studio credentials.
    """
    active_key = api_key or get_db_setting(db, "gemini_api_key") or settings.active_gemini_api_key
    if not active_key:
        logger.warning("[LLM Factory] No GEMINI_API_KEY / GOOGLE_API_KEY found in settings or DB.")
    return genai.Client(api_key=active_key or None)


def has_active_llm_key(db: Optional[Session] = None) -> bool:
    """
    Check if any active LLM API Key (OpenAI or Gemini) is configured in DB or environment settings.
    """
    def _is_valid(val: Optional[str]) -> bool:
        return bool(val and val.strip() and not val.strip().startswith("****"))

    db_gemini = get_db_setting(db, "gemini_api_key")
    db_openai = get_db_setting(db, "openai_api_key")

    return (
        _is_valid(db_gemini)
        or _is_valid(db_openai)
        or _is_valid(settings.OPENAI_API_KEY)
        or _is_valid(settings.active_gemini_api_key)
    )


def get_chat_llm(
    provider: Optional[str] = None,
    model_name: Optional[str] = None,
    temperature: Optional[float] = None,
    api_key: Optional[str] = None,
    api_base: Optional[str] = None,
    streaming: bool = False,
    max_retries: int = 2,
    json_mode: bool = False,
    db: Optional[Session] = None,
) -> BaseChatModel:
    """
    Unified LLM Factory for instantiating LangChain chat models.
    Supports both Google AI Studio (Gemma / Gemini) and OpenAI-Compatible APIs (CosmosHub / DeepSeek).
    """
    # Read dynamic settings from DB if present
    db_provider = get_db_setting(db, "llm_provider")
    db_model = get_db_setting(db, "ai_model")
    db_temp = get_db_setting(db, "temperature")
    db_gemini_key = get_db_setting(db, "gemini_api_key")
    db_openai_key = get_db_setting(db, "openai_api_key")
    db_openai_base = get_db_setting(db, "openai_api_base")

    # 1. Determine active provider
    selected_provider = (provider or db_provider or settings.LLM_PROVIDER or "openai").lower()
    active_model = model_name or db_model

    # Infer provider from model name if active_model is known
    if active_model:
        mn_lower = active_model.lower()
        if "gemini" in mn_lower or "gemma" in mn_lower:
            selected_provider = "google"
        elif "deepseek" in mn_lower or "glm" in mn_lower or "gpt" in mn_lower:
            selected_provider = "openai"

    if "google" in selected_provider or "gemini" in selected_provider or "gemma" in selected_provider:
        selected_provider = "google"
    else:
        selected_provider = "openai"

    # 2. Determine temperature
    if temperature is not None:
        selected_temp = temperature
    elif db_temp is not None:
        try:
            selected_temp = float(db_temp)
        except ValueError:
            selected_temp = 0.0
    else:
        selected_temp = 0.0

    if selected_provider == "google":
        final_model = active_model or settings.GEMINI_MODEL or "gemma-4-26b-a4b-it"
        final_key = api_key or db_gemini_key or settings.active_gemini_api_key

        if not final_key:
            logger.warning("[LLM Factory] Active Google API Key is missing!")

        logger.info(f"[LLM Factory] Instantiating ChatGoogleGenerativeAI (model='{final_model}', temp={selected_temp})")

        return ChatGoogleGenerativeAI(
            model=final_model,
            temperature=selected_temp,
            google_api_key=final_key,
            max_retries=max_retries,
            streaming=streaming,
        )

    else:
        # OpenAI Compatible (CosmosHub / DeepSeek / GLM / Nemotron)
        final_model = active_model or settings.OPENAI_MODEL or "glm-4-plus"
        final_key = api_key or db_openai_key or settings.OPENAI_API_KEY
        def _clean_str(val: Optional[str]) -> Optional[str]:
            return val.strip() if val and val.strip() else None

        final_base = (
            _clean_str(api_base)
            or _clean_str(db_openai_base)
            or _clean_str(settings.OPENAI_API_BASE)
            or "https://api.cosmoshub.tech/v1"
        )

        if not final_key:
            logger.warning("[LLM Factory] Active OpenAI API Key is missing!")

        logger.info(f"[LLM Factory] Instantiating ChatOpenAI (model='{final_model}', temp={selected_temp}, base='{final_base}')")

        model_kwargs = {}
        if json_mode:
            model_kwargs["response_format"] = {"type": "json_object"}

        return ChatOpenAI(
            model=final_model,
            temperature=selected_temp,
            api_key=final_key,
            base_url=final_base,
            streaming=streaming,
            max_retries=max_retries,
            model_kwargs=model_kwargs,
        )
