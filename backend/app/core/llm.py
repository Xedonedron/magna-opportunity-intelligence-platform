import logging
from typing import Optional
from google import genai
from langchain_google_genai import ChatGoogleGenerativeAI
from app.core.config import settings

logger = logging.getLogger(__name__)


def get_genai_client() -> genai.Client:
    """
    Get a native Google GenAI SDK Client instance configured with active Google AI Studio credentials.
    """
    api_key = settings.active_gemini_api_key
    if not api_key:
        logger.warning("[LLM Factory] No GEMINI_API_KEY / GOOGLE_API_KEY found in settings.")
    return genai.Client(api_key=api_key or None)


def get_chat_llm(
    model_name: Optional[str] = None,
    temperature: Optional[float] = None,
    max_retries: int = 2,
) -> ChatGoogleGenerativeAI:
    """
    Get a LangChain ChatGoogleGenerativeAI model instance configured for Google AI Studio.
    Defaults to model 'gemma-4-26b-a4b-it' if unspecified.
    """
    selected_model = model_name or settings.GEMINI_MODEL or "gemma-4-26b-a4b-it"
    selected_temp = temperature if temperature is not None else 1.0
    api_key = settings.active_gemini_api_key

    if not api_key:
        logger.warning("[LLM Factory] Active Google API Key is missing!")

    logger.info(f"[LLM Factory] Instantiating ChatGoogleGenerativeAI (model='{selected_model}', temp={selected_temp})")

    return ChatGoogleGenerativeAI(
        model=selected_model,
        temperature=selected_temp,
        google_api_key=api_key,
        max_retries=max_retries,
    )
