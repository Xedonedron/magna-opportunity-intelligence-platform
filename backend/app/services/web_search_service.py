"""Web search service using Tavily API for KYC research."""

import logging
from typing import Optional

from tavily import TavilyClient

from app.core.config import settings

logger = logging.getLogger(__name__)


class WebSearchService:
    """Service for searching the web using Tavily API."""

    def __init__(self):
        self.client: Optional[TavilyClient] = None
        if settings.TAVILY_API_KEY:
            self.client = TavilyClient(api_key=settings.TAVILY_API_KEY)

    def search_company(self, company_name: str, website: Optional[str] = None) -> dict:
        """Search for company information across multiple queries.

        Returns a dict with search results organized by category.
        """
        results = {
            "company_info": [],
            "news": [],
            "linkedin": [],
            "website_content": None,
        }

        if not self.client:
            logger.warning("Tavily API key not configured, skipping web search")
            return results

        try:
            # Search 1: Company overview and business info
            company_query = f"{company_name} company overview business model industry"
            if website:
                company_query += f" site:{website}"

            response = self.client.search(
                query=company_query,
                search_depth="advanced",
                max_results=5,
                include_answer=True,
            )
            results["company_info"] = response.get("results", [])
            results["company_answer"] = response.get("answer", "")

            # Search 2: Recent news
            news_response = self.client.search(
                query=f"{company_name} news 2024 2025",
                search_depth="basic",
                max_results=5,
                topic="news",
            )
            results["news"] = news_response.get("results", [])

            # Search 3: LinkedIn info
            linkedin_response = self.client.search(
                query=f"{company_name} LinkedIn company profile",
                search_depth="basic",
                max_results=3,
            )
            results["linkedin"] = linkedin_response.get("results", [])

            logger.info(f"Web search completed for {company_name}")

        except Exception as e:
            logger.error(f"Web search failed for {company_name}: {e}")

        return results

    def search_industry_use_cases(
        self, industry: str, customer_needs: str, product: Optional[str] = None
    ) -> list:
        """Search for industry-specific use cases and solutions aligned with customer needs."""
        if not self.client:
            return []

        try:
            # Construct a query focused on the industry + product + customer needs keywords
            query_parts = []
            if industry:
                query_parts.append(industry)
            if product:
                query_parts.append(product)

            # Simple keyword extraction from customer needs:
            keywords = ["dashboard", "reporting", "visualization", "migration", "analytics", "business intelligence", "database", "infrastructure", "security"]
            found_keywords = [kw for kw in keywords if kw in customer_needs.lower()]

            # Translate Indonesian keywords to English for better search results
            lower_needs = customer_needs.lower()
            if "visualisasi" in lower_needs:
                found_keywords.append("visualization")
            if "laporan" in lower_needs or "report" in lower_needs:
                found_keywords.append("reporting")
            if "migrasi" in lower_needs:
                found_keywords.append("migration")
            if "keamanan" in lower_needs:
                found_keywords.append("security")

            if found_keywords:
                query_parts.append(" ".join(list(set(found_keywords))[:3]))

            if len(query_parts) <= 1:
                query_parts.append("cloud AI solutions")

            query = " ".join(query_parts) + " use cases solutions enterprise"
            logger.info(f"[Search Service] Searching industry use cases with query: {query}")

            response = self.client.search(
                query=query,
                search_depth="advanced",
                max_results=5,
                include_answer=True,
            )
            return response.get("results", [])
        except Exception as e:
            logger.error(f"Industry use case search failed: {e}")
            return []


# Singleton instance
web_search_service = WebSearchService()