#!/usr/bin/env python3
"""
Scraper script to extract articles from https://magnaglobal.id/blog-news
Extracts clean text, subheadings, technology keywords, and target industry verticals.
"""

import json
import os
import re
import sys
import time
import urllib.request
from typing import Dict, List, Any, Optional

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
}

KNOWN_PRODUCTS = [
    # Google Cloud Core
    "Google Cloud", "GCP", "BigQuery", "Dataflow", "Vertex AI", "Gemini", "Looker", 
    "Google Kubernetes Engine", "GKE", "Cloud Run", "Pub/Sub", "Cloud Storage", 
    "Cloud DLP", "Cloud Monitoring", "Cloud SQL", "Dataproc", "Anthos", "Firebase", 
    "Config Connector", "Apigee", "Security Command Center", "SCC Enterprise", 
    "Google Threat Intelligence", "Google Workspace",
    # Security & Infrastructure Vendors / Products
    "Zero Trust", "PAM", "Privileged Access Management", "EPM", "Endpoint Privilege Management",
    "SIEM", "SOC", "NGAV", "Next-Generation Antivirus", "EDR", "XDR", "NDR", "Network Detection and Response",
    "Ransomware Protection", "Data Loss Prevention", "DLP", "IAM", "Identity and Access Management",
    "VMware", "Nutanix", "Hyperconverged Infrastructure", "HCI", "All-Flash Storage", "Hybrid Cloud"
]

KNOWN_VERTICALS = {
    "FSI / Banking & Multifinance": ["fsi", "bank", "banking", "multifinance", "ojk", "fraud", "fintech", "nasabah", "transaksi"],
    "Healthcare": ["rumah sakit", "rekam medis", "pasien", "kesehatan", "healthcare", "medis"],
    "Retail & E-Commerce": ["retail", "ritel", "e-commerce", "toko", "belanja", "customer experience"],
    "Real Estate & Property": ["realty", "properti", "perumahan", "modernland", "real estate"],
    "Public Sector & BUMN": ["pusat data nasional", "pdn", "pemerintah", "bumn", "kementerian", "regulasi"],
}


def fetch_url(url: str, max_retries: int = 3, timeout: int = 15) -> Optional[str]:
    """Fetch URL with retries."""
    for attempt in range(1, max_retries + 1):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read().decode('utf-8', errors='ignore')
        except Exception as e:
            if attempt < max_retries:
                time.sleep(1.0 * attempt)
            else:
                print(f"[Error] Failed to fetch {url} after {max_retries} attempts: {e}")
                return None


def get_all_article_links(base_url: str = "https://magnaglobal.id/blog-news/") -> List[str]:
    """Iterate all pagination pages to collect article URLs."""
    article_links = []
    seen = set()
    page = 1

    print("[1/3] Discovering article links across pagination...")
    while True:
        page_url = base_url if page == 1 else f"{base_url}page/{page}/"
        print(f"  Scanning page {page}: {page_url}")
        html = fetch_url(page_url)
        if not html:
            break

        found_links = re.findall(r'https://magnaglobal\.id/articles/([a-zA-Z0-9\-_]+)/?', html)
        new_urls = []
        for slug in found_links:
            full_url = f"https://magnaglobal.id/articles/{slug}"
            if full_url not in seen:
                seen.add(full_url)
                new_urls.append(full_url)
                article_links.append(full_url)

        print(f"    -> Found {len(new_urls)} new articles (Total so far: {len(article_links)})")
        if not new_urls:
            break
        page += 1
        time.sleep(0.3)

    return article_links


def parse_article(url: str, html: str) -> Dict[str, Any]:
    """Extract structured data from article HTML."""
    slug = url.rstrip('/').split('/')[-1]

    # 1. Extract Title
    title = slug.replace('-', ' ').title()
    title_match = re.search(r'<title>(.*?)(?: - Smartnet Magna Global)?</title>', html, re.IGNORECASE)
    if title_match:
        title = title_match.group(1).replace(' - Smartnet Magna Global', '').strip()

    # 2. Extract Article Body
    # In Elementor, main content is inside elementor-widget-theme-post-content
    body_text = ""
    headings = []

    content_start = html.find('elementor-widget-theme-post-content')
    if content_start != -1:
        # Take generous slice
        content_html = html[content_start:content_start + 40000]
        # Clean scripts, styles
        content_html = re.sub(r'<script.*?</script>', '', content_html, flags=re.DOTALL)
        content_html = re.sub(r'<style.*?</style>', '', content_html, flags=re.DOTALL)

        # Extract subheadings H2, H3, H4
        raw_headings = re.findall(r'<h[234][^>]*>(.*?)</h[234]>', content_html, flags=re.DOTALL)
        for h in raw_headings:
            clean_h = re.sub(r'<[^>]+>', '', h).strip()
            # Clean common noise in headings
            if clean_h and len(clean_h) < 120 and "whatsapp" not in clean_h.lower() and "click to chat" not in clean_h.lower() and "about smartnet" not in clean_h.lower():
                headings.append(clean_h)

        # Strip HTML tags
        stripped = re.sub(r'<[^>]+>', ' ', content_html)
        body_text = ' '.join(stripped.split())

        # Cut off footer / related posts widgets
        for cutoff in ["Bagikan Artikel Ini", "Artikel Terkait", "ABOUT SMARTNET MAGNA GLOBAL", "Click To Chat"]:
            idx = body_text.find(cutoff)
            if idx != -1:
                body_text = body_text[:idx].strip()
    else:
        # Fallback strip body
        stripped = re.sub(r'<[^>]+>', ' ', html)
        body_text = ' '.join(stripped.split())[:5000]

    # 3. Detect Mentioned Products
    lower_text = (title + " " + " ".join(headings) + " " + body_text).lower()
    matched_products = []
    for prod in KNOWN_PRODUCTS:
        if prod.lower() in lower_text:
            matched_products.append(prod)

    # 4. Detect Target Verticals
    matched_verticals = []
    for vertical_name, keywords in KNOWN_VERTICALS.items():
        if any(kw in lower_text for kw in keywords):
            matched_verticals.append(vertical_name)

    return {
        "url": url,
        "slug": slug,
        "title": title,
        "headings": headings,
        "products_mentioned": list(dict.fromkeys(matched_products)),
        "verticals": matched_verticals,
        "content_length": len(body_text),
        "content": body_text,
    }


def main():
    print("=== PT SMG Knowledge Base Article Scraper ===")
    article_urls = get_all_article_links()
    print(f"\n[2/3] Total articles to crawl: {len(article_urls)}")

    scraped_data = []
    output_dir = os.path.join(os.path.dirname(__file__), "..", "app", "data")
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, "scraped_articles.json")

    for i, url in enumerate(article_urls, 1):
        print(f"  [{i}/{len(article_urls)}] Scraping {url}...")
        html = fetch_url(url)
        if not html:
            continue

        item = parse_article(url, html)
        scraped_data.append(item)
        print(f"     -> Title: {item['title'][:45]}... | Products: {len(item['products_mentioned'])} | Chars: {item['content_length']}")
        time.sleep(0.15)

    print(f"\n[3/3] Saving {len(scraped_data)} parsed articles to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(scraped_data, f, ensure_ascii=False, indent=2)

    print(f"Scraping completed successfully! Output file: {output_file}")


if __name__ == "__main__":
    main()
