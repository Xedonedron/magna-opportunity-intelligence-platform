#!/usr/bin/env python3
"""
Filter and structure scraped SMG articles into curated Solution Cards for MOIP.
Classifies articles into Tier 1 (Concrete Product/Solution), Tier 2 (Niche/Strategic Framework),
and Tier 3 (Generic 101 - Filtered Out).
"""

import json
import os
import re
from typing import Dict, List, Any

# Explicit manual overrides/boosts for specific important articles
HIGH_VALUE_SLUGS = {
    "menghentikan-fraud-sebelum-merugikan-pendekatan-predictive-analytics-untuk-fsi": {
        "pillar": "Data Analytics & AI",
        "custom_title": "Real-Time Anti-Fraud & Predictive Analytics untuk FSI",
        "primary_products": ["Dataflow", "BigQuery", "BigQuery ML", "Vertex AI", "Pub/Sub", "Looker"],
    },
    "transformasi-keamanan-it-modernland-realty-bersama-smg-dengan-endpoint-security-next-generation-antivirus": {
        "pillar": "Cybersecurity Suite",
        "custom_title": "Case Study Modernland Realty: Modern Endpoint Security & NGAV",
        "primary_products": ["NGAV", "EDR", "Endpoint Security"],
    },
    "mengapa-vmware-tak-lagi-relevan-dan-bagaimana-menyusun-exit-strategy-yang-tepat-bagi-bisnis-anda": {
        "pillar": "Cloud Infrastructure & Modernization",
        "custom_title": "VMware Exit Strategy & Workload Modernization ke Cloud / Kube",
        "primary_products": ["GCP", "GKE", "Anthos", "Nutanix"],
    },
    "kenali-homogeneous-database-migration-langkah-strategis-membangun-fondasi-data-untuk-ai": {
        "pillar": "Data Analytics & AI",
        "custom_title": "Homogeneous Database Migration & AI Data Foundation",
        "primary_products": ["Cloud SQL", "BigQuery", "Database Migration Service"],
    },
    "google-security-command-center-enterprise-untuk-kelola-keamanan-multicloud": {
        "pillar": "Cybersecurity Suite",
        "custom_title": "Security Command Center (SCC) Enterprise untuk Multicloud",
        "primary_products": ["Security Command Center", "SCC Enterprise", "Mandiant"],
    },
    "kenali-google-threat-intelligence-solusi-proaktif-keamanan-siber-berbasis-ai": {
        "pillar": "Cybersecurity Suite",
        "custom_title": "Google Threat Intelligence (GTI) Berbasis AI & Mandiant",
        "primary_products": ["Google Threat Intelligence", "Mandiant Threat Intelligence"],
    },
    "google-bigquery-x-gemini-ai-menyatukan-kekuatan-data-dan-kecerdasan-ai": {
        "pillar": "Data Analytics & AI",
        "custom_title": "BigQuery x Gemini AI: Generative Analytics & Enterprise BI",
        "primary_products": ["BigQuery", "Gemini", "Vertex AI"],
    },
    "cari-tahu-mengapa-google-kubernetes-engine-jadi-solusi-tepat-untuk-pengelolaan-aplikasi": {
        "pillar": "Cloud Infrastructure & Modernization",
        "custom_title": "Google Kubernetes Engine (GKE) Enterprise Application Orchestration",
        "primary_products": ["Google Kubernetes Engine", "GKE"],
    },
    "bikin-aplikasi-jadi-cepat-dan-mudah-dengan-cloud-run": {
        "pillar": "Cloud Infrastructure & Modernization",
        "custom_title": "Serverless Container Modernization dengan Cloud Run",
        "primary_products": ["Cloud Run", "Serverless"],
    },
    "otomatisasi-operasional-bisnis-anda-gak-ribet-lagi-dengan-vertex-ai": {
        "pillar": "Data Analytics & AI",
        "custom_title": "Enterprise ML & AI Operations dengan Vertex AI",
        "primary_products": ["Vertex AI", "Gemini"],
    },
    "endpoint-privilege-management-solusi-tepat-cegah-ancaman-internal": {
        "pillar": "Cybersecurity Suite",
        "custom_title": "Endpoint Privilege Management (EPM) & Least-Privilege Architecture",
        "primary_products": ["EPM", "PAM", "Endpoint Security"],
    },
    "privileged-access-management-mengambil-kendali-atas-akses-kritis-di-infrastruktur-it": {
        "pillar": "Cybersecurity Suite",
        "custom_title": "Privileged Access Management (PAM) untuk Akses Kritis IT",
        "primary_products": ["PAM", "IAM"],
    },
    "rekam-medis-lambat-nyawa-jadi-taruhan-saatnya-pakai-all-flash-storage": {
        "pillar": "Cloud Infrastructure & Modernization",
        "custom_title": "High-Performance All-Flash Storage untuk Rekam Medis Rumah Sakit",
        "primary_products": ["All-Flash Storage", "Hybrid Cloud Storage"],
    },
    "ndr-langkah-strategis-bfsi-dalam-menangkal-serangan-siber": {
        "pillar": "Cybersecurity Suite",
        "custom_title": "Network Detection and Response (NDR) untuk Sektor Perbankan (BFSI)",
        "primary_products": ["NDR", "SIEM", "SOC"],
    },
    "cloud-backup-pusat-data-nasional-down-backup-data-data-recovery": {
        "pillar": "Cloud Infrastructure & Modernization",
        "custom_title": "Enterprise Cloud Backup & Disaster Recovery Pasca PDN Incident",
        "primary_products": ["Cloud Storage", "Disaster Recovery", "Cloud Backup"],
    },
    "apa-itu-config-connector-dan-keuntungannya-untuk-kelola-google-cloud": {
        "pillar": "Cloud Infrastructure & Modernization",
        "custom_title": "Infrastructure-as-Code & Declarative Cloud Management dengan Config Connector",
        "primary_products": ["Config Connector", "GKE", "GCP"],
    },
    "benarkah-data-di-cloud-aman-kenalan-dengan-cloud-dlp-untuk-cegah-kebocoran": {
        "pillar": "Cybersecurity Suite",
        "custom_title": "Automated Cloud DLP untuk Pencegahan Kebocoran Data Sensitif",
        "primary_products": ["Cloud DLP", "Sensitive Data Protection"],
    },
    "mengupas-alasan-ai-agents-retail-jadi-standar-baru-customer-experience": {
        "pillar": "Data Analytics & AI",
        "custom_title": "Retail AI Agents & Modern Customer Experience",
        "primary_products": ["Vertex AI", "Gemini", "AI Agents"],
    },
    "wujudkan-ai-readiness-dalam-transformasi-digital-melalui-3-tahap-strategis-ini": {
        "pillar": "Data Analytics & AI",
        "custom_title": "3-Stage AI Readiness Strategic Advisory Framework",
        "primary_products": ["AI Readiness Assessment", "Vertex AI", "BigQuery"],
    },
    "zero-trust-security-mengapa-firewall-tak-lagi-ampuh-lindungi-bisnis-anda": {
        "pillar": "Cybersecurity Suite",
        "custom_title": "Zero Trust Architecture: Identity & Context-Aware Perimeter",
        "primary_products": ["Zero Trust", "IAM", "BeyondCorp"],
    }
}

# Slug patterns indicating generic 101 content
GENERIC_PATTERNS = [
    r"^apa-itu-(?:siem|ci-cd|dbms|data-warehouse)",
    r"^big-data-analytics-data-analytics-adalah",
    r"^virtualization-adalah",
    r"^mengenal-apa-itu",
    r"^mengenal-database-management-system",
    r"^mengenal-fungsi-dan-keuntungan-data-warehouse",
    r"^jangan-salah-pilih-ini-perbedaan-blade-vs-rack-server",
    r"^bingung-pilih-google-maps-atau-waze",
    r"^4-jenis-data-analytics",
    r"^ini-alasan-mengapa-keamanan-data-penting",
    r"^tren-teknologi-2025",
]


def classify_article(article: Dict[str, Any]) -> Dict[str, Any]:
    slug = article["slug"]
    title = article["title"]
    headings = article["headings"]
    products = article["products_mentioned"]
    verticals = article["verticals"]
    content = article["content"]

    # 1. Check explicit override
    if slug in HIGH_VALUE_SLUGS:
        meta = HIGH_VALUE_SLUGS[slug]
        return {
            "tier": 1,
            "status": "APPROVED",
            "reason": "Direct product solution / case study match",
            "pillar": meta["pillar"],
            "title": meta["custom_title"],
            "primary_products": meta["primary_products"],
        }

    # 2. Check generic 101 patterns (Tier 3 - Reject)
    for pat in GENERIC_PATTERNS:
        if re.search(pat, slug, re.IGNORECASE):
            return {
                "tier": 3,
                "status": "FILTERED_OUT",
                "reason": "Generic 101 introductory / SEO concept definition",
                "pillar": "Generic",
                "title": title,
                "primary_products": [],
            }

    # 3. Heuristic Scoring
    score = 0
    reasons = []

    # Products count
    if len(products) >= 2:
        score += 2
        reasons.append(f"Specific tech products: {', '.join(products[:3])}")
    elif len(products) == 1:
        score += 1

    # Vertical specific
    if verticals:
        score += 1
        reasons.append(f"Vertical focus: {', '.join(verticals)}")

    # Technical subheadings
    tech_subheadings = [h for h in headings if any(k in h.lower() for k in ["arsitektur", "cloud", "ai", "pipeline", "migrasi", "scoring", "monitoring", "storage", "security", "engine"])]
    if len(tech_subheadings) >= 2:
        score += 2
        reasons.append(f"Technical subheadings: {len(tech_subheadings)}")

    # Check for basic definition keywords in title
    if any(term in title.lower() for term in ["adalah", "apa itu", "mengenal apa", "perbedaan blade vs rack"]):
        score -= 2

    # Determine pillar
    pillar = "Cloud Infrastructure & Modernization"
    if any(k in (title + " " + " ".join(products)).lower() for k in ["data", "bigquery", "analytics", "vertex", "bi", "ai", "machine learning"]):
        pillar = "Data Analytics & AI"
    elif any(k in (title + " " + " ".join(products)).lower() for k in ["security", "antivirus", "ransomware", "threat", "siem", "soc", "zero trust", "pam", "epm", "dlp"]):
        pillar = "Cybersecurity Suite"
    elif any(k in (title + " " + " ".join(products)).lower() for k in ["workspace", "network", "sd-wan", "sase"]):
        pillar = "Network & Enterprise Workplace"

    if score >= 3:
        return {
            "tier": 1,
            "status": "APPROVED",
            "reason": "; ".join(reasons) or "High technical depth",
            "pillar": pillar,
            "title": title,
            "primary_products": products[:4],
        }
    elif score >= 1:
        return {
            "tier": 2,
            "status": "APPROVED_NICHE",
            "reason": "; ".join(reasons) or "Moderate technical / consultative context",
            "pillar": pillar,
            "title": title,
            "primary_products": products[:3],
        }
    else:
        return {
            "tier": 3,
            "status": "FILTERED_OUT",
            "reason": "Introductory / generic concept with low architectural specificity",
            "pillar": pillar,
            "title": title,
            "primary_products": products,
        }


def extract_pain_points_and_impact(content: str) -> tuple[list[str], str]:
    """Extract key problems and value propositions from content."""
    pain_points = []
    # Match sentences mentioning tantangan / risiko / kendala / masalah / kerugian
    sentences = re.split(r'(?<=[.!?]) +', content)
    for s in sentences:
        s_clean = s.strip()
        if len(s_clean) > 30 and len(s_clean) < 220:
            if any(k in s_clean.lower() for k in ["tantangan", "kendala", "risiko", "serangan", "kebocoran", "kerugian", "sulit", "downtime", "biaya tinggi"]):
                if s_clean not in pain_points and len(pain_points) < 3:
                    pain_points.append(s_clean)

    impact = "Meningkatkan efisiensi operasional, reliabilitas infrastruktur, dan memitigasi risiko keamanan data secara terukur."
    for s in sentences:
        s_clean = s.strip()
        if len(s_clean) > 40 and len(s_clean) < 250:
            if any(k in s_clean.lower() for k in ["memungkinkan perusahaan", "membantu perusahaan", "memberikan visibilitas", "efisiensi biaya"]):
                impact = s_clean
                break

    return pain_points, impact


def main():
    data_dir = os.path.join(os.path.dirname(__file__), "..", "app", "data")
    input_file = os.path.join(data_dir, "scraped_articles.json")

    if not os.path.exists(input_file):
        print(f"Error: Scraped data file {input_file} not found. Run scraper first.")
        sys.exit(1)

    with open(input_file, "r", encoding="utf-8") as f:
        articles = json.load(f)

    print(f"Loaded {len(articles)} articles. Classifying into Tiers...")

    tier1_items = []
    tier2_items = []
    tier3_items = []
    curated_cards = []

    for art in articles:
        res = classify_article(art)
        pain_points, impact = extract_pain_points_and_impact(art["content"])

        card = {
            "id": art["slug"],
            "tier": res["tier"],
            "status": res["status"],
            "title": res["title"],
            "pillar": res["pillar"],
            "primary_products": res["primary_products"],
            "all_products": art["products_mentioned"],
            "target_industries": art["verticals"] if art["verticals"] else ["Enterprise General"],
            "source_url": art["url"],
            "key_subheadings": art["headings"][:6],
            "pain_points": pain_points,
            "business_impact": impact,
            "filter_reason": res["reason"],
            "summary_snippet": art["content"][:350] + "...",
        }

        if res["tier"] == 1:
            tier1_items.append(card)
            curated_cards.append(card)
        elif res["tier"] == 2:
            tier2_items.append(card)
            curated_cards.append(card)
        else:
            tier3_items.append(card)

    print(f"\nClassification Results:")
    print(f"  - Tier 1 (High-Value Concrete Solutions): {len(tier1_items)}")
    print(f"  - Tier 2 (Niche Concepts & Frameworks): {len(tier2_items)}")
    print(f"  - Tier 3 (Filtered Out / Generic 101): {len(tier3_items)}")
    print(f"  -> Total Approved for MOIP Grounding: {len(curated_cards)}")

    # Save Curated Solutions JSON
    curated_output = os.path.join(data_dir, "curated_solutions.json")
    with open(curated_output, "w", encoding="utf-8") as f:
        json.dump(curated_cards, f, ensure_ascii=False, indent=2)
    print(f"\nSaved curated solutions to {curated_output}")

    # Generate Audit Markdown Report
    report_output = os.path.join(data_dir, "solutions_filtering_report.md")
    with open(report_output, "w", encoding="utf-8") as f:
        f.write("# Laporan Klasifikasi & Penapisan Artikel Solusi PT SMG\n\n")
        f.write(f"Total Artikel Dianalisis: **{len(articles)}**  \n")
        f.write(f"- **Tier 1 (Approved - Concrete Solutions & Products)**: {len(tier1_items)}\n")
        f.write(f"- **Tier 2 (Approved - Niche Concepts & Frameworks)**: {len(tier2_items)}\n")
        f.write(f"- **Tier 3 (Filtered Out - Generic 101 Introductory)**: {len(tier3_items)}\n\n")
        f.write("---\n\n")

        f.write("## 1. Tier 1: Solusi Konkret & Produk Unggulan (Wajib Masuk Grounding)\n\n")
        f.write("| No | Judul Solusi | Pilar | Produk Utama | Target Industri |\n")
        f.write("|---|---|---|---|---|\n")
        for i, item in enumerate(tier1_items, 1):
            prods = ", ".join(item["primary_products"]) or "-"
            verts = ", ".join(item["target_industries"])
            f.write(f"| {i} | [{item['title']}]({item['source_url']}) | {item['pillar']} | {prods} | {verts} |\n")

        f.write("\n## 2. Tier 2: Kerangka Kerja Strategis & Niche Presales\n\n")
        f.write("| No | Judul Solusi | Pilar | Produk Utama | Target Industri |\n")
        f.write("|---|---|---|---|---|\n")
        for i, item in enumerate(tier2_items, 1):
            prods = ", ".join(item["primary_products"]) or "-"
            verts = ", ".join(item["target_industries"])
            f.write(f"| {i} | [{item['title']}]({item['source_url']}) | {item['pillar']} | {prods} | {verts} |\n")

        f.write("\n## 3. Tier 3: Artikel yang Difilter Keluar (Generic 101 / SEO)\n\n")
        f.write("| No | Judul Artikel | Alasan Penapisan |\n")
        f.write("|---|---|---|\n")
        for i, item in enumerate(tier3_items, 1):
            f.write(f"| {i} | [{item['title']}]({item['source_url']}) | {item['filter_reason']} |\n")

    print(f"Generated filtering audit report: {report_output}")


if __name__ == "__main__":
    main()
