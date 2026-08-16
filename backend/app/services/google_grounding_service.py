"""
Google Search Grounding service using Google GenAI SDK (Gemini 2.5 / 3.6 / Flash).
Fetches live web search citations directly from Google's search index.
"""

import logging
from typing import Any, Optional
from google import genai
from google.genai import types

from app.core.config import settings
from app.core.llm import get_db_setting

logger = logging.getLogger(__name__)


class GoogleGroundingService:
    """Service to execute Google Search Grounding for live accurate web data."""

    def __init__(self):
        pass

    def _get_client(self, db: Any = None) -> Optional[genai.Client]:
        active_key = get_db_setting(db, "gemini_api_key") or settings.active_gemini_api_key
        if not active_key:
            logger.warning("[GoogleGrounding] No active Gemini API key configured.")
            return None
        return genai.Client(api_key=active_key)

    def search_and_ground(
        self,
        prompt: str,
        model_name: str = "gemini-2.5-flash",
        db: Any = None,
    ) -> dict[str, Any]:
        """
        Query Gemini with native Google Search Grounding enabled.
        Returns generated content and grounded web source metadata.
        """
        client = self._get_client(db)
        if not client:
            return {"content": "", "sources": [], "grounding_metadata": {}}

        # If model is Gemma (which may not support native search tool), fallback to gemini-2.5-flash
        target_model = model_name
        if "gemma" in target_model.lower():
            target_model = "gemini-2.5-flash"

        try:
            response = client.models.generate_content(
                model=target_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    tools=[types.Tool(google_search=types.GoogleSearch())],
                    temperature=0.0,
                ),
            )

            content = response.text or ""
            sources: list[dict[str, Any]] = []
            grounding_meta: dict[str, Any] = {}

            # Extract grounding citations if available
            if hasattr(response, "candidates") and response.candidates:
                candidate = response.candidates[0]
                if hasattr(candidate, "grounding_metadata") and candidate.grounding_metadata:
                    gm = candidate.grounding_metadata
                    # Extract search queries
                    search_queries = getattr(gm, "web_search_queries", []) or []
                    grounding_meta["web_search_queries"] = search_queries

                    # Extract grounding chunks (sources / URLs)
                    chunks = getattr(gm, "grounding_chunks", []) or []
                    for c in chunks:
                        web = getattr(c, "web", None)
                        if web:
                            uri = getattr(web, "uri", "")
                            title = getattr(web, "title", "")
                            if uri:
                                sources.append({
                                    "url": uri,
                                    "title": title or uri,
                                    "source": "google_search",
                                })

            logger.info(f"[GoogleGrounding] Succeeded with {len(sources)} grounded sources.")
            return {
                "content": content,
                "sources": sources,
                "grounding_metadata": grounding_meta,
            }
        except Exception as e:
            logger.error(f"[GoogleGrounding] Grounded search failed: {e}")
            return {"content": "", "sources": [], "grounding_metadata": {}, "error": str(e)}

    def search_company(self, company_name: str, website: Optional[str] = None, db: Any = None) -> dict[str, Any]:
        """
        Grounding search wrapper for Company Overview & News.
        """
        query_prompt = (
            f"Search Google for accurate, up-to-date business information about the company: '{company_name}'. "
            f"Official website: '{website or 'N/A'}'. "
            f"Provide a structured summary of their core business, industry, products/services, and recent news."
        )
        res = self.search_and_ground(query_prompt, db=db)
        
        company_info = []
        for s in res.get("sources", []):
            company_info.append({
                "title": s.get("title", company_name),
                "url": s.get("url", ""),
                "content": res.get("content", "")[:300],
            })

        return {
            "company_info": company_info,
            "company_answer": res.get("content", ""),
            "news": company_info[1:] if len(company_info) > 1 else [],
            "linkedin": [],
            "website_content": None,
        }

    def search_industry_use_cases(
        self, industry: str, customer_needs: str, product: Optional[str] = None, db: Any = None
    ) -> list[dict[str, Any]]:
        """
        Grounding search wrapper for Industry Use Cases.
        """
        query_prompt = (
            f"Search Google for real-world enterprise use cases and technological solutions in the '{industry}' industry "
            f"specifically addressing customer needs: '{customer_needs}' and target product: '{product or 'Cloud & AI'}'. "
            f"Provide specific case studies and references."
        )
        res = self.search_and_ground(query_prompt, db=db)
        
        use_cases = []
        for s in res.get("sources", []):
            use_cases.append({
                "title": s.get("title", f"{industry} Solution"),
                "url": s.get("url", ""),
                "content": res.get("content", "")[:400],
            })
        return use_cases


google_grounding_service = GoogleGroundingService()