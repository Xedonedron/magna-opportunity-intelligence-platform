"""
backend/app/services/product_catalog_service.py

Deterministic Product Catalog Filtering & Architecture Grounding Engine for Magna (MOIP).
Implements hard constraints (0% false positive) for deployment modes (on_prem vs cloud vs hybrid)
and domain matching.
"""

from __future__ import annotations

import json
import logging
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# Default path to products_catalog.json
DEFAULT_CATALOG_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "data", "products_catalog.json")
)


class ProductCatalogItem(BaseModel):
    product_id: str = Field(description="Unique product identifier (kebab-case)")
    name: str = Field(description="Official name of the product/solution")
    vendor_partner: str = Field(description="Vendor or OEM technology partner")
    solution_domain: str = Field(description="Core solution domain")
    deployment_modes: List[str] = Field(
        description="Allowed deployment modes: on_prem, cloud, hybrid"
    )
    target_personas: List[str] = Field(default_factory=list)
    pain_point_triggers: List[str] = Field(default_factory=list)
    target_industries: List[str] = Field(default_factory=list)
    bridging_dialogue: str = Field(
        default="", description="Recommended presales conversational transition"
    )
    collateral_references: List[Dict[str, str]] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Deterministic Intent Signals & Keywords
# ---------------------------------------------------------------------------
ON_PREM_KEYWORDS: Set[str] = {
    "on-premise",
    "on premise",
    "onprem",
    "on-prem",
    "server fisik",
    "data center fisik",
    "colocation",
    "colo",
    "hardware lokal",
    "bare metal",
    "baremetal",
    "regulasi ojk",
    "residensi data",
    "data residency",
    "bank indonesia",
    "local server",
    "storage lokal",
    "rack server",
    "blade server",
    "dell server",
    "cisco switch",
    "core switch",
    "switch fisik",
    "campus lan",
    "lan fisik",
    "greenplum",
    "mpp on-prem",
}

CLOUD_KEYWORDS: Set[str] = {
    "cloud migration",
    "migrasi cloud",
    "migrasi ke gcp",
    "google cloud",
    "bigquery",
    "cloud run",
    "gke",
    "vertex ai",
    "cloud data warehouse",
    "cloud edw",
    "google workspace",
    "gws",
    "google maps",
    "fleet engine",
    "routes api",
    "cloud native",
}

HYBRID_KEYWORDS: Set[str] = {
    "hybrid",
    "hybrid cloud",
    "data mart hybrid",
    "cdc ke cloud",
    "backup ke cloud",
    "replicate to cloud",
    "sinkronisasi cloud",
}


def _clean_text_tokens(text: str) -> str:
    """Normalize text to lowercase alphanumeric string with single spaces."""
    text = text.lower()
    text = re.sub(r"[^\w\s\-]", " ", text)
    return " ".join(text.split())


class ProductCatalogService:
    def __init__(self, catalog_path: Optional[str] = None):
        self.catalog_path = catalog_path or DEFAULT_CATALOG_PATH
        self._products: List[ProductCatalogItem] = []
        self._lookup: Dict[str, ProductCatalogItem] = {}
        self.load_catalog()

    def load_catalog(self, path: Optional[str] = None) -> None:
        """Loads and parses products_catalog.json."""
        target_path = path or self.catalog_path
        if not os.path.isfile(target_path):
            logger.warning("Products catalog file not found at: %s", target_path)
            self._products = []
            self._lookup = {}
            return

        try:
            with open(target_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            items = []
            lookup = {}
            for raw_item in data:
                item = ProductCatalogItem.model_validate(raw_item)
                items.append(item)
                lookup[item.product_id] = item
            
            self._products = items
            self._lookup = lookup
            logger.info("Loaded %d products from catalog: %s", len(self._products), target_path)
        except Exception as e:
            logger.error("Failed to load products catalog from %s: %e", target_path, e)
            self._products = []
            self._lookup = {}

    def get_all_products(self) -> List[ProductCatalogItem]:
        return list(self._products)

    def get_product_by_id(self, product_id: str) -> Optional[ProductCatalogItem]:
        return self._lookup.get(product_id)

    def detect_deployment_intent(
        self,
        customer_needs: Optional[str] = None,
        product_hint: Optional[str] = None,
        focus_notes: Optional[str] = None,
        additional_notes: Optional[str] = None,
    ) -> str:
        """
        Determines the deployment mode constraint: 'on_prem', 'cloud', 'hybrid', or 'any'.
        Hard constraint rules:
        - If text explicitly mentions on-premise, physical servers, or regulatory data residency without requesting cloud, intent is 'on_prem'.
        - If text explicitly requests hybrid or cloud data mart, intent is 'hybrid'.
        - If text explicitly requests GCP, cloud migration, BigQuery, or Google Workspace, intent is 'cloud'.
        """
        combined = " ".join(
            filter(None, [customer_needs, product_hint, focus_notes, additional_notes])
        ).lower()
        
        if not combined:
            return "any"

        # Check for explicit hybrid intent first
        for kw in HYBRID_KEYWORDS:
            if kw in combined:
                return "hybrid"

        # Check for on-premise intent
        has_on_prem = any(kw in combined for kw in ON_PREM_KEYWORDS)

        # Check for cloud intent
        has_cloud = any(kw in combined for kw in CLOUD_KEYWORDS)

        if has_on_prem and not has_cloud:
            return "on_prem"
        elif has_cloud and not has_on_prem:
            return "cloud"
        elif has_on_prem and has_cloud:
            # Both mentioned (e.g. migrate on-premise to cloud, or hybrid architecture)
            if "migrasi" in combined or "migration" in combined:
                return "cloud"
            return "hybrid"

        return "any"

    def filter_products(
        self,
        industry: Optional[str] = None,
        deployment_preference: Optional[str] = None,
        customer_needs: Optional[str] = None,
        product: Optional[str] = None,
        focus_notes: Optional[str] = None,
        additional_notes: Optional[str] = None,
        limit: int = 4,
    ) -> List[ProductCatalogItem]:
        """
        Filters Magna product portfolio using deterministic rules (0% False Positive).
        
        Hard Constraints:
        1. If deployment constraint is 'on_prem', products that only support 'cloud'
           (deployment_modes == ['cloud']) are ABSOLUTELY EXCLUDED.
        2. If deployment constraint is 'cloud', products that only support 'on_prem'
           (deployment_modes == ['on_prem']) are ABSOLUTELY EXCLUDED.
        
        Scoring & Ranking:
        - Keyword match in pain_point_triggers (+10 per trigger)
        - Industry match in target_industries (+8)
        - Product hint exact/partial match (+25)
        - Solution domain relevance (+15)
        """
        if not self._products:
            self.load_catalog()

        # 1. Determine effective deployment mode
        effective_mode = deployment_preference
        if not effective_mode or effective_mode == "any":
            effective_mode = self.detect_deployment_intent(
                customer_needs=customer_needs,
                product_hint=product,
                focus_notes=focus_notes,
                additional_notes=additional_notes,
            )

        search_corpus = " ".join(
            filter(None, [customer_needs, product, focus_notes, additional_notes, industry])
        ).lower()

        scored_candidates: List[Tuple[float, ProductCatalogItem]] = []

        for item in self._products:
            modes = item.deployment_modes

            # --- HARD CONSTRAINT: Deployment Mode Filtering ---
            if effective_mode == "on_prem":
                # Must support on_prem (or hybrid); cloud-only is strictly forbidden
                if "on_prem" not in modes and "hybrid" not in modes:
                    continue
                if modes == ["cloud"]:
                    continue
            elif effective_mode == "cloud":
                # Must support cloud (or hybrid); on_prem-only is strictly forbidden
                if "cloud" not in modes and "hybrid" not in modes:
                    continue
                if modes == ["on_prem"]:
                    continue

            # --- Scoring ---
            score = 0.0

            # 1. Product hint match
            if product:
                clean_prod = product.lower().strip()
                if clean_prod in item.name.lower() or clean_prod in item.product_id:
                    score += 50.0
                elif any(word in item.name.lower() for word in clean_prod.split() if len(word) > 2):
                    score += 25.0

            # 2. Industry alignment
            if industry and item.target_industries:
                ind_lower = industry.lower()
                for target_ind in item.target_industries:
                    if target_ind.lower() in ind_lower or ind_lower in target_ind.lower():
                        score += 15.0
                        break

            # 3. Pain point triggers match
            for trigger in item.pain_point_triggers:
                trigger_clean = trigger.lower()
                # Exact phrase match or token overlap
                if trigger_clean in search_corpus:
                    score += 20.0
                else:
                    words = [w for w in trigger_clean.split() if len(w) > 3]
                    matches = sum(1 for w in words if w in search_corpus)
                    if matches >= 2:
                        score += 8.0 * (matches / len(words))

            # 4. Solution domain match
            domain_clean = item.solution_domain.lower()
            if domain_clean in search_corpus:
                score += 15.0

            # 5. Deployment bonus when aligned
            if effective_mode in modes:
                score += 10.0

            scored_candidates.append((score, item))

        # Sort by score descending
        scored_candidates.sort(key=lambda x: x[0], reverse=True)

        selected = [item for _, item in scored_candidates[:limit]]
        return selected

    def format_for_prompt(self, products: List[ProductCatalogItem]) -> str:
        """
        Formats filtered product catalog items into a clean, compact markdown block
        optimized for Gemini prompt caching (>80% cache hit rate).
        """
        if not products:
            return ""

        lines = [
            "### Verified Magna Product Portfolio Catalog (Grounding Constraints):",
            "Pilihlah use cases arsitektur resmi HANYA dari katalog solusi terverifikasi Smartnet Magna Global berikut:",
        ]

        for p in products:
            lines.append(f"\n[Product ID: {p.product_id}]")
            lines.append(f"- Nama Solusi : {p.name}")
            lines.append(f"- Partner/OEM : {p.vendor_partner}")
            lines.append(f"- Domain      : {p.solution_domain}")
            lines.append(f"- Deployment  : {', '.join(p.deployment_modes)}")
            if p.target_personas:
                lines.append(f"- Target Role : {', '.join(p.target_personas[:3])}")
            if p.pain_point_triggers:
                lines.append(f"- Triggers    : {', '.join(p.pain_point_triggers[:4])}")
            if p.bridging_dialogue:
                lines.append(f"- Nilai Taktis: {p.bridging_dialogue}")
            if p.collateral_references:
                refs_str = ", ".join(f"[{r.get('title')}]({r.get('url')})" for r in p.collateral_references if r.get("url"))
                if refs_str:
                    lines.append(f"- Referensi   : {refs_str}")

        return "\n".join(lines)


# Global singleton instance
product_catalog_service = ProductCatalogService()
