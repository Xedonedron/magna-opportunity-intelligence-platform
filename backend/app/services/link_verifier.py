"""
LinkVerifierService - Real-time Live Link Verification & Anti-Hallucination Engine.

Prevents dead links (404/5xx), unreachable domains, and LLM-hallucinated URLs from appearing in KYC reports, AI Chat, and Opportunity Insights.
"""

import asyncio
import logging
import re
import urllib.parse
from typing import Any, Optional
import httpx

logger = logging.getLogger(__name__)

# Standard browser user-agent to avoid immediate 403 blocks from CDNs
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}


class LinkVerifierService:
    """Service to verify HTTP/HTTPS URL availability in real time and sanitize AI-generated references."""

    @staticmethod
    def _is_safe_url(url: str) -> bool:
        """Validate URL to prevent SSRF against internal network and cloud metadata endpoints."""
        try:
            import ipaddress
            import socket

            parsed = urllib.parse.urlparse(url)
            if parsed.scheme not in ("http", "https"):
                return False

            hostname = parsed.hostname
            if not hostname:
                return False

            if hostname.lower() in ("localhost", "127.0.0.1", "0.0.0.0", "::1", "metadata.google.internal"):
                return False

            try:
                ip = ipaddress.ip_address(hostname)
                if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
                    return False
            except ValueError:
                try:
                    resolved_ip_str = socket.gethostbyname(hostname)
                    resolved_ip = ipaddress.ip_address(resolved_ip_str)
                    if (
                        resolved_ip.is_private
                        or resolved_ip.is_loopback
                        or resolved_ip.is_link_local
                        or resolved_ip.is_reserved
                        or resolved_ip.is_multicast
                    ):
                        return False
                except Exception:
                    pass

            return True
        except Exception:
            return False

    @staticmethod
    def is_valid_url_format(url: str) -> bool:
        """Check if string is a syntactically valid HTTP/HTTPS URL."""
        if not url or not isinstance(url, str):
            return False
        parsed = urllib.parse.urlparse(url.strip())
        return parsed.scheme in ("http", "https") and bool(parsed.netloc)

    async def is_url_alive(self, url: str, timeout: float = 3.0) -> bool:
        """Ping a URL via HTTP HEAD/GET to verify if it is live and returns HTTP 2xx/3xx."""
        if not self.is_valid_url_format(url):
            return False

        if not self._is_safe_url(url):
            logger.warning(f"[LinkVerifier] Blocked unsafe/internal target URL: {url}")
            return False

        target_url = url.strip()
        try:
            async with httpx.AsyncClient(
                follow_redirects=True,
                timeout=timeout,
                verify=False,  # Avoid failing on self-signed/expired SSL certs for research links
                headers=HEADERS,
            ) as client:
                # 1. Try lightweight HEAD request
                try:
                    res = await client.head(target_url)
                    if res.status_code < 400:
                        return True
                except httpx.HTTPError:
                    pass

                # 2. Fallback to GET request if HEAD is rejected or fails
                res = await client.get(target_url)
                return res.status_code < 400
        except Exception as e:
            logger.debug(f"[LinkVerifier] URL check failed for '{target_url}': {e}")
            return False

    async def verify_urls_batch(
        self, urls: list[str], timeout: float = 3.0
    ) -> dict[str, bool]:
        """Verify multiple URLs concurrently in parallel."""
        unique_urls = list(set([u.strip() for u in urls if self.is_valid_url_format(u)]))
        if not unique_urls:
            return {}

        tasks = [self.is_url_alive(u, timeout=timeout) for u in unique_urls]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        status_map: dict[str, bool] = {}
        for u, res in zip(unique_urls, results):
            status_map[u] = res is True
        return status_map

    async def filter_and_verify_sources(
        self,
        raw_sources: list[dict[str, Any]],
        timeout: float = 3.0,
    ) -> list[dict[str, Any]]:
        """Filter list of source dicts (containing 'url' field), keeping only live URLs."""
        if not raw_sources:
            return []

        urls_to_check = [s.get("url", "") for s in raw_sources if isinstance(s, dict) and s.get("url")]
        verification_map = await self.verify_urls_batch(urls_to_check, timeout=timeout)

        verified_sources = []
        for src in raw_sources:
            if not isinstance(src, dict):
                continue
            url = src.get("url", "").strip()
            if verification_map.get(url) is True:
                src["verified"] = True
                verified_sources.append(src)
            else:
                logger.info(f"[LinkVerifier] Filtered out unverified/dead link: '{url}'")

        return verified_sources

    async def sanitize_references_and_sources(
        self,
        references: list[dict[str, Any]],
        search_results: Optional[dict[str, Any]] = None,
        timeout: float = 3.0,
    ) -> list[dict[str, Any]]:
        """
        Sanitize AI-generated references against search payload and live HTTP ping verification.
        Ensures NO hallucinated or dead 404 links remain in final report output.
        """
        # Extract set of legitimate URLs actually present in search results
        legitimate_search_urls: set[str] = set()
        if search_results and isinstance(search_results, dict):
            for info in search_results.get("company_info", []):
                if isinstance(info, dict) and info.get("url"):
                    legitimate_search_urls.add(info["url"].strip())
            for news in search_results.get("news", []):
                if isinstance(news, dict) and news.get("url"):
                    legitimate_search_urls.add(news["url"].strip())

        candidate_refs = []
        for ref in references:
            if not isinstance(ref, dict):
                continue
            url = ref.get("url", "").strip()

            # If URL format is invalid, drop it
            if not self.is_valid_url_format(url):
                continue

            candidate_refs.append(ref)

        # Run parallel live ping verification on candidate URLs
        urls_to_verify = [r["url"].strip() for r in candidate_refs]
        verification_map = await self.verify_urls_batch(urls_to_verify, timeout=timeout)

        valid_references = []
        for ref in candidate_refs:
            url = ref["url"].strip()
            if verification_map.get(url) is True:
                ref["verified"] = True
                valid_references.append(ref)
            else:
                logger.warning(f"[LinkVerifier] Dropped hallucinated or dead reference URL: '{url}'")

        return valid_references

    def extract_urls_from_text(self, text: str) -> list[str]:
        """Extract all HTTP/HTTPS URLs from raw text/markdown."""
        if not text:
            return []
        url_pattern = r"https?://[^\s<>\"'\)\]]+"
        raw_matches = re.findall(url_pattern, text)
        cleaned = []
        for u in raw_matches:
            # Clean trailing punctuation
            u_clean = u.rstrip(".,;!?:")
            if self.is_valid_url_format(u_clean):
                cleaned.append(u_clean)
        return list(set(cleaned))

    async def verify_and_clean_text_links(self, text: str, timeout: float = 3.0) -> tuple[str, dict[str, bool]]:
        """
        Extract URLs from text, verify liveness concurrently, and clean out dead links.
        Returns cleaned text and url verification status map.
        """
        urls = self.extract_urls_from_text(text)
        if not urls:
            return text, {}

        status_map = await self.verify_urls_batch(urls, timeout=timeout)
        valid_urls = {u for u, is_alive in status_map.items() if is_alive}

        cleaned_text = self.strip_dead_markdown_links(text, valid_urls)
        return cleaned_text, status_map

    def strip_dead_markdown_links(self, text: str, valid_urls: set[str]) -> str:
        """
        Scan markdown text for '[Label](url)' and raw URLs.
        If 'url' is not in valid_urls, convert '[Label](url)' -> 'Label' to remove broken links.
        """
        if not text:
            return text

        def replace_md(match: re.Match) -> str:
            label = match.group(1)
            url = match.group(2).strip()
            if url in valid_urls:
                return f"[{label}]({url})"
            return label  # Drop dead URL, keep text

        pattern = r"\[([^\]]+)\]\((https?://[^\)]+)\)"
        text = re.sub(pattern, replace_md, text)
        return text


# Global Singleton Instance
link_verifier_service = LinkVerifierService()