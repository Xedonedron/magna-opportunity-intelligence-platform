"""Web crawling service for extracting content from company websites."""

import ipaddress
import logging
import socket
from typing import Optional
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


class WebCrawlerService:
    """Service for crawling and extracting content from websites."""

    def __init__(self):
        self.timeout = 15.0
        self.max_content_length = 10000

    @staticmethod
    def _is_safe_url(url: str) -> bool:
        """Validate URL to prevent SSRF against internal network and cloud metadata endpoints."""
        try:
            parsed = urlparse(url)
            if parsed.scheme not in ("http", "https"):
                return False
            hostname = parsed.hostname
            if not hostname:
                return False
            
            # Resolve IP
            ip_str = socket.gethostbyname(hostname)
            ip = ipaddress.ip_address(ip_str)

            # Block private, loopback, link-local (169.254.169.254 GCP metadata), and multicast
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved:
                return False
            return True
        except Exception:
            return False

    async def crawl_website(self, url: str) -> Optional[dict]:
        """Crawl a website and extract key content.

        Returns dict with title, description, text_content, and links.
        """
        if not url:
            return None

        # Ensure URL has scheme
        if not url.startswith(("http://", "https://")):
            url = f"https://{url}"

        if not self._is_safe_url(url):
            logger.warning(f"Blocked SSRF attempt or invalid target URL: {url}")
            return None

        try:
            async with httpx.AsyncClient(
                timeout=self.timeout,
                follow_redirects=True,
                headers={
                    "User-Agent": "Mozilla/5.0 (compatible; MOIP-KYC-Bot/1.0)"
                },
            ) as client:
                response = await client.get(url)
                response.raise_for_status()

                soup = BeautifulSoup(response.text, "html.parser")

                # Remove script and style elements
                for script in soup(["script", "style", "nav", "footer", "header"]):
                    script.decompose()

                # Extract title
                title = soup.title.string.strip() if soup.title else ""

                # Extract meta description
                meta_desc = ""
                meta_tag = soup.find("meta", attrs={"name": "description"})
                if meta_tag and meta_tag.get("content"):
                    meta_desc = meta_tag["content"].strip()

                # Extract main text content
                text_content = soup.get_text(separator=" ", strip=True)
                if len(text_content) > self.max_content_length:
                    text_content = text_content[: self.max_content_length] + "..."

                # Extract headings for structure
                headings = []
                for h in soup.find_all(["h1", "h2", "h3"])[:10]:
                    heading_text = h.get_text(strip=True)
                    if heading_text:
                        headings.append(heading_text)

                return {
                    "url": url,
                    "title": title,
                    "description": meta_desc,
                    "text_content": text_content,
                    "headings": headings,
                    "status_code": response.status_code,
                }

        except httpx.TimeoutException:
            logger.warning(f"Timeout crawling {url}")
            return None
        except httpx.HTTPStatusError as e:
            logger.warning(f"HTTP error crawling {url}: {e.response.status_code}")
            return None
        except Exception as e:
            logger.error(f"Failed to crawl {url}: {e}")
            return None

    def extract_domain_info(self, url: str) -> dict:
        """Extract basic domain information from URL."""
        try:
            parsed = urlparse(url if "://" in url else f"https://{url}")
            domain = parsed.netloc or parsed.path
            return {
                "domain": domain,
                "is_subdomain": len(domain.split(".")) > 2,
                "tld": domain.split(".")[-1] if domain else "",
            }
        except Exception:
            return {"domain": "", "is_subdomain": False, "tld": ""}


# Singleton instance
web_crawler_service = WebCrawlerService()