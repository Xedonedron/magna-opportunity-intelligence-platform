"""
SMG Solutions Catalog & Knowledge Grounding Engine.

Provides centralized, curated solution architectures, tech stacks, and real-world
case studies from PT Smartnet Magna Global for injection into AI KYC pipelines
and Opportunity Chat Assistants.

Architecture: Two-Tier Context-Aware & Semantic Intent Matching with Pillar Boundary Governance.
"""

from __future__ import annotations

import json
import logging
import os
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple

logger = logging.getLogger(__name__)

DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "curated_solutions.json")


@dataclass
class SolutionCard:
    id: str
    title: str
    pillar: str
    tier: int
    primary_products: List[str]
    all_products: List[str]
    target_industries: List[str]
    source_url: str
    key_subheadings: List[str] = field(default_factory=list)
    pain_points: List[str] = field(default_factory=list)
    business_impact: str = ""
    summary_snippet: str = ""



# ---------------------------------------------------------------------------
# Intent & Domain Classification Tables
# ---------------------------------------------------------------------------
PILLAR_INFRA = "Cloud Infrastructure & Modernization"
PILLAR_DATA = "Data Analytics & AI"
PILLAR_SECURITY = "Cybersecurity Suite"
PILLAR_NETWORK = "Network & Enterprise Workplace"

# (keywords, pillar, environment)  environment: on_premise|campus_lan|cloud|hybrid|None
INTENT_SIGNALS: List[Tuple[List[str], str, Optional[str]]] = [
    (["dell server", "dell poweredge", "hpe proliant", "hpe server", "nutanix", "hci",
      "hyperconverged", "hyper converged", "vmware", "vsphere", "bare metal", "baremetal",
      "on premise", "on-premise", "colocation", "data center fisik", "server fisik",
      "rack server", "blade server", "xfusion", "sangfor hci",
      "san storage", "nas", "all-flash", "all flash storage"],
     PILLAR_INFRA, "on_premise"),
    (["google maps", "google maps platform", "routes api", "places api", "geocoding api",
      "distance matrix", "fleet tracking", "fleet engine", "location intelligence",
      "rute armada", "geospatial", "store locator", "asset tracking"],
     PILLAR_INFRA, "cloud"),
    (["campus lan", "campus network", "wifi", "wi-fi", "wi fi", "wireless lan", "wlan",
      "access point", "cisco catalyst", "aruba", "hpe networking", "extreme networks",
      "network switch", "layer 2", "layer 3", "wpa3", "wifi 6", "wi-fi 6",
      "poe switch", "solarwinds", "prtg", "network monitoring",
      "healthcare lan", "lan rumah sakit", "emr", "iot medis"],
     PILLAR_NETWORK, "campus_lan"),
    (["google workspace", "workspace", "gmail enterprise", "gmail", "google drive",
      "google meet", "google chat", "google vault", "gemini for workspace",
      "gemini for google workspace", "email migration", "migrasi email", "zimbra",
      "exchange online", "modern workplace", "cloud identity", "drive dlp"],
     PILLAR_NETWORK, None),
    (["pam", "privileged access", "beyondtrust", "epm", "endpoint privilege",
      "ngav", "antivirus", "edr", "endpoint security", "crowdstrike", "sentinelone",
      "trend micro", "symantec", "sophos", "kaspersky", "ransomware", "malware",
      "ngfw", "firewall", "fortinet", "fortigate", "palo alto", "check point",
      "siem", "soar", "soc", "secops", "chronicle", "mandiant", "threat intelligence",
      "security command center", "scc", "dlp", "data loss prevention", "zero trust",
      "beyondcorp", "ndr", "network detection", "iam", "identity access"],
     PILLAR_SECURITY, None),
    (["bigquery", "vertex ai", "gemini", "dataflow", "dataproc", "cloud composer",
      "pub/sub", "pubsub", "looker", "cloud sql", "cloud run", "gke", "kubernetes",
      "anthos", "cloud storage", "gcp", "google cloud", "aws",
      "data warehouse", "data lake", "etl", "elt", "data pipeline", "streaming",
      "machine learning", "ai readiness", "predictive analytics", "bigquery ml",
      "cloud migration", "cloud native", "serverless", "firebase",
      "snowflake", "confluent", "greenplum", "dbt",
      "datastream", "cdc", "change data capture", "planet ban",
      "malika", "procurement ai", "pengadaan ai", "document analytics",
      "talend", "cloudera"],
     PILLAR_DATA, "cloud"),
]

# If primary environment is X, suppress these pillars from results
PILLAR_SUPPRESSION: Dict[str, set] = {
    "on_premise": {PILLAR_DATA},
    "campus_lan": {PILLAR_SECURITY, PILLAR_DATA},
}


def _word_boundary_match(token: str, text_lower: str) -> bool:
    """Whole-word/phrase match. Prevents 'lan' matching inside 'penjualan'."""
    if ' ' in token or '/' in token or '-' in token:
        return token in text_lower
    return bool(re.search(r'\b' + re.escape(token) + r'\b', text_lower))


def _classify_intent(search_text: str) -> Tuple[Optional[str], Optional[str]]:
    """Classify input into (primary_pillar, target_environment)."""
    text_lower = search_text.lower()
    pillar_scores: Dict[str, int] = {}
    env_votes: Dict[str, int] = {}

    for keywords, pillar, env in INTENT_SIGNALS:
        for kw in keywords:
            if _word_boundary_match(kw, text_lower):
                pillar_scores[pillar] = pillar_scores.get(pillar, 0) + 1
                if env:
                    env_votes[env] = env_votes.get(env, 0) + 1

    if not pillar_scores:
        return None, None

    primary_pillar = max(pillar_scores, key=pillar_scores.get)  # type: ignore[arg-type]
    target_env = max(env_votes, key=env_votes.get) if env_votes else None  # type: ignore[arg-type]

    # Hybrid override: don't suppress cloud if migration/hybrid explicitly mentioned
    if target_env == "on_premise":
        hybrid_signals = ["hybrid", "cloud migration", "migrasi cloud", "modernisasi", "modernization"]
        if any(_word_boundary_match(s, text_lower) for s in hybrid_signals):
            target_env = "hybrid"

    return primary_pillar, target_env



# Fallback core catalog if curated_solutions.json has not yet been populated
BUILTIN_CORE_SOLUTIONS: List[Dict[str, Any]] = [
    {
        "id": "menghentikan-fraud-sebelum-merugikan-pendekatan-predictive-analytics-untuk-fsi",
        "title": "Real-Time Anti-Fraud & Predictive Analytics untuk FSI",
        "pillar": "Data Analytics & AI",
        "tier": 1,
        "primary_products": ["Dataflow", "BigQuery", "BigQuery ML", "Vertex AI", "Pub/Sub", "Looker"],
        "all_products": ["Dataflow", "BigQuery", "BigQuery ML", "Vertex AI", "Pub/Sub", "Looker", "Gemini", "Cloud Storage"],
        "target_industries": ["FSI / Banking & Multifinance"],
        "source_url": "https://magnaglobal.id/articles/menghentikan-fraud-sebelum-merugikan-pendekatan-predictive-analytics-untuk-fsi",
        "key_subheadings": [
            "Tantangan Deteksi Fraud Tradisional di Perusahaan FSI",
            "Streaming Data Ingestion & Event-Driven Processing",
            "Dataflow untuk Pemrosesan Data Real-Time",
            "BigQuery ML untuk Fraud Detection Berbasis SQL",
            "Vertex AI untuk Model Development dan Real-Time Inference Scoring",
            "Looker untuk Fraud Monitoring Dashboard"
        ],
        "pain_points": [
            "Kerugian transaksi fraud dan scam yang masif di sektor keuangan (data OJK mencapai Rp2,5T).",
            "Terlalu banyak false positive pada rule-based engine tradisional yang mengganggu transaksi sah nasabah.",
            "Keterlambatan deteksi akibat sistem batch processing yang lambat."
        ],
        "business_impact": "Mendeteksi anomali transaksi dalam hitungan milidetik secara streaming, mereduksi false positive hingga 60%, dan memitigasi risiko kerugian finansial nasabah.",
        "summary_snippet": "Solusi end-to-end deteksi fraud real-time menggunakan Pub/Sub untuk data ingestion, Google Cloud Dataflow untuk pipeline streaming event-driven, BigQuery & BigQuery ML untuk pattern matching, serta Vertex AI untuk model scoring prediktif."
    },
    {
        "id": "transformasi-keamanan-it-modernland-realty-bersama-smg-dengan-endpoint-security-next-generation-antivirus",
        "title": "Case Study Modernland Realty: Modern Endpoint Security & NGAV",
        "pillar": "Cybersecurity Suite",
        "tier": 1,
        "primary_products": ["NGAV", "EDR", "Endpoint Security"],
        "all_products": ["NGAV", "EDR", "Zero Trust", "Ransomware Protection"],
        "target_industries": ["Real Estate & Property", "Enterprise General"],
        "source_url": "https://magnaglobal.id/articles/transformasi-keamanan-it-modernland-realty-bersama-smg-dengan-endpoint-security-next-generation-antivirus",
        "key_subheadings": [
            "Tantangan Keamanan Endpoints Terdistribusi di Modernland Realty",
            "Penerapan Next-Generation Antivirus (NGAV) berbasis Behavioral AI",
            "Sentralisasi Visibilitas dan Otomasi Isolasi Ancaman",
            "Hasil Implementasi Bersama Smartnet Magna Global"
        ],
        "pain_points": [
            "Ancaman ransomware modern yang mampu mengelabui antivirus berbasis signature tradisional.",
            "Beban operasional tim IT dalam mengelola ratusan endpoint di lokasi proyek properti yang tersebar."
        ],
        "business_impact": "Proteksi proaktif 24/7 terhadap zero-day malware & ransomware, otomatisasi remediasi ancaman endpoint, dan peningkatan compliance IT enterprise.",
        "summary_snippet": "Studi kasus sukses implementasi Next-Generation Antivirus (NGAV) dan EDR oleh PT Smartnet Magna Global di Modernland Realty untuk melindungi ratusan workstation dan server dari ancaman siber canggih."
    },
    {
        "id": "mengapa-vmware-tak-lagi-relevan-dan-bagaimana-menyusun-exit-strategy-yang-tepat-bagi-bisnis-anda",
        "title": "VMware Exit Strategy & Modernisasi Workload ke Cloud / Kubernetes",
        "pillar": "Cloud Infrastructure & Modernization",
        "tier": 1,
        "primary_products": ["Google Cloud", "GKE", "Anthos", "Nutanix"],
        "all_products": ["Google Cloud", "GCP", "GKE", "Anthos", "Nutanix", "HCI"],
        "target_industries": ["Enterprise General", "FSI / Banking & Multifinance"],
        "source_url": "https://magnaglobal.id/articles/mengapa-vmware-tak-lagi-relevan-dan-bagaimana-menyusun-exit-strategy-yang-tepat-bagi-bisnis-anda",
        "key_subheadings": [
            "Kenaikan Biaya Lisensi & Ketidakpastian Ekosistem Pasca Akuisisi VMware",
            "Opsi Migrasi: Google Cloud VMware Engine (GCVE) vs Rehost vs Containerization",
            "Modernisasi VM ke Google Kubernetes Engine (GKE) dengan Anthos",
            "Tahapan Roadmap Exit Strategy Terstruktur Bersama SMG"
        ],
        "pain_points": [
            "Lonjakan biaya perpanjangan lisensi virtualisasi VMware yang memberatkan anggaran IT OPEX/CAPEX.",
            "Keterikatan vendor (vendor lock-in) pada infrastruktur virtualisasi on-premise lama."
        ],
        "business_impact": "Efisiensi biaya lisensi hingga 40-50%, percepatan modernisasi ke arsitektur cloud-native/kontainer, dan portabilitas workload.",
        "summary_snippet": "Konsultasi dan implementasi strategi transisi terstruktur dari lingkungan VMware ke Google Cloud (GCVE / GKE) atau solusi HCI modern tanpa downtime operasional."
    },
    {
        "id": "kenali-homogeneous-database-migration-langkah-strategis-membangun-fondasi-data-untuk-ai",
        "title": "Homogeneous Database Migration & AI Data Foundation",
        "pillar": "Data Analytics & AI",
        "tier": 1,
        "primary_products": ["Cloud SQL", "BigQuery", "Database Migration Service"],
        "all_products": ["Cloud SQL", "BigQuery", "GCP", "Vertex AI"],
        "target_industries": ["Enterprise General", "FSI / Banking & Multifinance"],
        "source_url": "https://magnaglobal.id/articles/kenali-homogeneous-database-migration-langkah-strategis-membangun-fondasi-data-untuk-ai",
        "key_subheadings": [
            "Membangun Fondasi Data yang Andal Sebelum Mengadopsi AI",
            "Keunggulan Homogeneous Database Migration (Zero Code Refactor)",
            "Continuous Replication dengan Google Cloud Database Migration Service (DMS)",
            "Integrasi Langsung ke BigQuery dan Vertex AI untuk Analitik Lanjutan"
        ],
        "pain_points": [
            "Silo data operasional on-premise yang tidak mampu menangani beban query analitik real-time dan AI.",
            "Kekhawatiran downtime transaksi dan risiko korupsi data selama proses migrasi database."
        ],
        "business_impact": "Migrasi database operasional (PostgreSQL, MySQL, SQL Server) dengan zero downtime replication, high availability 99.99%, dan kesiapan integrasi AI.",
        "summary_snippet": "Layanan migrasi database homogen ke Cloud SQL dan BigQuery menggunakan Database Migration Service (DMS) untuk membangun fondasi data modern yang siap AI."
    },
    {
        "id": "google-security-command-center-enterprise-untuk-kelola-keamanan-multicloud",
        "title": "Security Command Center (SCC) Enterprise untuk Multicloud & AI Security",
        "pillar": "Cybersecurity Suite",
        "tier": 1,
        "primary_products": ["Security Command Center", "SCC Enterprise", "Mandiant"],
        "all_products": ["Security Command Center", "SCC Enterprise", "Mandiant", "Cloud DLP"],
        "target_industries": ["Enterprise General", "FSI / Banking & Multifinance"],
        "source_url": "https://magnaglobal.id/articles/mengenal-google-security-command-center-enterprise-untuk-kelola-keamanan-multicloud",
        "key_subheadings": [
            "Visibilitas Keamanan Terpusat Lintas Cloud (GCP, AWS, Azure)",
            "Integrasi Mandiant Threat Intelligence & AI Security Posture",
            "Automated Cloud Misconfiguration & Vulnerability Remediation",
            "Kepatuhan Standar Regulasi (ISO 27001, PCI-DSS, SOC 2)"
        ],
        "pain_points": [
            "Blind spots keamanan akibat infrastruktur multicloud yang tersebar di berbagai provider.",
            "Banyaknya miskonfigurasi cloud yang tidak terdeteksi hingga terjadi eksploitasi."
        ],
        "business_impact": "Visibilitas postur keamanan terpadu 100%, otomatisasi deteksi miskonfigurasi, dan mitigasi ancaman siber berbasis Mandiant intelligence.",
        "summary_snippet": "Implementasi SCC Enterprise untuk pemantauan postur keamanan terpusat lintas Google Cloud, AWS, dan lingkungan on-premise dengan panduan respons otomatis."
    },
    {
        "id": "google-bigquery-x-gemini-ai-menyatukan-kekuatan-data-dan-kecerdasan-ai",
        "title": "BigQuery x Gemini AI: Generative Analytics & Enterprise Insights",
        "pillar": "Data Analytics & AI",
        "tier": 1,
        "primary_products": ["BigQuery", "Gemini", "Vertex AI", "Looker"],
        "all_products": ["BigQuery", "Gemini", "Vertex AI", "Looker"],
        "target_industries": ["Enterprise General", "Retail & E-Commerce", "FSI / Banking & Multifinance"],
        "source_url": "https://magnaglobal.id/articles/google-bigquery-x-gemini-ai-menyatukan-kekuatan-data-dan-kecerdasan-ai",
        "key_subheadings": [
            "Transformasi Analisis Data dengan Multimodal Generative AI",
            "Menjalankan Model Gemini Langsung di Dalam Query BigQuery",
            "Analisis Sentimen Klien dan Unstructured Data Enrichment",
            "Visualisasi Dashboard Interaktif di Looker Studio"
        ],
        "pain_points": [
            "Kesulitan mengekstrak nilai bisnis dari data tidak terstruktur (feedback pelanggan, dokumen, log chat).",
            "Ketergantungan tinggi pada data scientist untuk pertanyaan analitik ad-hoc bisnis."
        ],
        "business_impact": "Percepatan time-to-insight hingga 70% dengan conversational data exploration dan pengolahan data multimodal skala petabyte langsung di data warehouse.",
        "summary_snippet": "Modernisasi analitik perusahaan dengan menggabungkan serverless data warehouse Google BigQuery dan model Gemini AI untuk menghasilkan insight prediktif dan naratif bisnis."
    },
    {
        "id": "cari-tahu-mengapa-google-kubernetes-engine-jadi-solusi-tepat-untuk-pengelolaan-aplikasi",
        "title": "Google Kubernetes Engine (GKE) Enterprise Orchestration & Modernization",
        "pillar": "Cloud Infrastructure & Modernization",
        "tier": 1,
        "primary_products": ["Google Kubernetes Engine", "GKE", "Cloud Run"],
        "all_products": ["Google Kubernetes Engine", "GKE", "Cloud Run", "GCP"],
        "target_industries": ["Enterprise General", "FSI / Banking & Multifinance", "Retail & E-Commerce"],
        "source_url": "https://magnaglobal.id/articles/cari-tahu-mengapa-google-kubernetes-engine-jadi-solusi-tepat-untuk-pengelolaan-aplikasi",
        "key_subheadings": [
            "Kelebihan GKE Autopilot untuk Zero Cluster Management Overhead",
            "Multi-Cluster High Availability & Global Load Balancing",
            "Penskalaan Otomatis (Autoscaling) Beban Kerja Saat Lonjakan Transaksi",
            "Best Practice DevOps & GitOps Continuous Deployment"
        ],
        "pain_points": [
            "Kompleksitas operasional dan maintenance cluster Kubernetes manual on-premise.",
            "Aplikasi sering down atau lambat saat menghadapi lonjakan transaksi puncak (peak season)."
        ],
        "business_impact": "Reliabilitas SLA 99.95%, efisiensi biaya komputasi dengan dynamic pod autoscaling, dan percepatan rilis fitur baru dari bulan ke hari.",
        "summary_snippet": "Perancangan arsitektur dan managed service GKE (Autopilot/Standard) untuk menjalankan aplikasi skala enterprise dengan auto-healing, auto-scaling, dan integrasi CI/CD modern."
    },
    {
        "id": "endpoint-privilege-management-solusi-tepat-cegah-ancaman-internal",
        "title": "Endpoint Privilege Management (EPM) & Least-Privilege Architecture",
        "pillar": "Cybersecurity Suite",
        "tier": 1,
        "primary_products": ["EPM", "PAM", "Endpoint Security"],
        "all_products": ["EPM", "PAM", "Endpoint Security", "Zero Trust"],
        "target_industries": ["Enterprise General", "FSI / Banking & Multifinance"],
        "source_url": "https://magnaglobal.id/articles/endpoint-privilege-management-solusi-tepat-cegah-ancaman-internal",
        "key_subheadings": [
            "Bahaya Hak Akses Administrator Berlebih pada Komputer Karyawan",
            "Penerapan Konsep Least Privilege Tanpa Menghambat Produktivitas",
            "Just-In-Time Elevation untuk Aplikasi Bisnis Spesifik",
            "Audit Trail Kepatuhan Hak Akses untuk Standar Regulasi"
        ],
        "pain_points": [
            "Karyawan memegang hak local administrator penuh sehingga malware dan ransomware dapat dengan mudah mengeksekusi script jahat.",
            "Kendala kepatuhan audit keamanan terkait manajemen privilege endpoint."
        ],
        "business_impact": "Melenyapkan risiko lateral movement dari malware hingga 90% dengan mencabut admin rights lokal tanpa mengganggu workflow operasional harian.",
        "summary_snippet": "Implementasi Endpoint Privilege Management (EPM) untuk mengontrol hak akses khusus aplikasi dan file secara kontekstual demi memitigasi ancaman siber internal maupun eksternal."
    },
    {
        "id": "zero-trust-security-mengapa-firewall-tak-lagi-ampuh-lindungi-bisnis-anda",
        "title": "Zero Trust Security Architecture: Context-Aware Access & BeyondCorp",
        "pillar": "Cybersecurity Suite",
        "tier": 2,
        "primary_products": ["Zero Trust", "BeyondCorp", "IAM"],
        "all_products": ["Zero Trust", "BeyondCorp", "IAM", "Google Cloud"],
        "target_industries": ["Enterprise General", "FSI / Banking & Multifinance"],
        "source_url": "https://magnaglobal.id/articles/zero-trust-security-mengapa-firewall-tak-lagi-ampuh-lindungi-bisnis-anda",
        "key_subheadings": [
            "Kelemahan Model Keamanan Perimeter / VPN Tradisional",
            "Prinsip 'Never Trust, Always Verify' Berbasis Identitas dan Device Health",
            "Implementasi Context-Aware Access Tanpa VPN yang Rumit",
            "Roadmap Transformasi Zero Trust Bertahap Bersama SMG"
        ],
        "pain_points": [
            "VPN tradisional yang lambat, rentan dieksploitasi, dan memberikan akses jaringan internal terlalu luas setelah login.",
            "Kebutuhan kerja remote/WFA yang aman untuk mengakses aplikasi web internal enterprise."
        ],
        "business_impact": "Akses aman ke aplikasi internal dari mana saja tanpa VPN, perlindungan menyeluruh dari credential theft, dan audit akses real-time.",
        "summary_snippet": "Konsultasi dan implementasi arsitektur Zero Trust model Google BeyondCorp Enterprise untuk melindungi akses ke aplikasi korporat berbasis identitas pengguna dan kondisi perangkat."
    }
]


class SolutionsCatalog:
    """Singleton catalog manager for PT Smartnet Magna Global solutions."""

    def __init__(self):
        self._cards: List[SolutionCard] = []
        self._load_catalog()

    def _load_catalog(self):
        # 1. Primary: Try loading from database master_solutions table
        try:
            from app.core.database import SessionLocal
            from app.models.master_solution import MasterSolution

            session = SessionLocal()
            try:
                db_solutions = session.query(MasterSolution).filter(MasterSolution.is_active == True).all()
                if db_solutions and len(db_solutions) > 0:
                    self._cards = [
                        SolutionCard(
                            id=str(s.id),
                            title=s.title,
                            pillar=s.pillar,
                            tier=s.tier,
                            primary_products=s.primary_products or [],
                            all_products=s.all_products or [],
                            target_industries=s.target_industries or ["Enterprise General"],
                            source_url=s.source_url or "",
                            key_subheadings=s.key_subheadings or [],
                            pain_points=s.pain_points or [],
                            business_impact=s.business_impact or "",
                            summary_snippet=s.summary_snippet or "",
                        )
                        for s in db_solutions
                    ]
                    logger.info(f"[SolutionsCatalog] Loaded {len(self._cards)} solutions from database master_solutions table.")
                    return
            finally:
                session.close()
        except Exception as db_err:
            logger.debug(f"[SolutionsCatalog] Database query bypassed/table not ready: {db_err}")

        # 2. Secondary: Fallback to curated_solutions.json
        loaded_raw = []
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, "r", encoding="utf-8") as f:
                    loaded_raw = json.load(f)
                logger.info(f"[SolutionsCatalog] Loaded {len(loaded_raw)} solutions from {DATA_FILE}")
            except Exception as e:
                logger.warning(f"[SolutionsCatalog] Failed to load {DATA_FILE}: {e}")

        if not loaded_raw:
            loaded_raw = BUILTIN_CORE_SOLUTIONS
            logger.info(f"[SolutionsCatalog] Using {len(loaded_raw)} builtin core solutions.")

        self._cards = [
            SolutionCard(
                id=item["id"],
                title=item["title"],
                pillar=item["pillar"],
                tier=item.get("tier", 1),
                primary_products=item.get("primary_products", []),
                all_products=item.get("all_products", []),
                target_industries=item.get("target_industries", ["Enterprise General"]),
                source_url=item.get("source_url", ""),
                key_subheadings=item.get("key_subheadings", []),
                pain_points=item.get("pain_points", []),
                business_impact=item.get("business_impact", ""),
                summary_snippet=item.get("summary_snippet", ""),
            )
            for item in loaded_raw
        ]

    def reload(self):
        """Force reload from disk if data was refreshed by scraper."""
        self._load_catalog()

    def get_all_cards(self) -> List[SolutionCard]:
        return self._cards

    def _score_card(self, card: SolutionCard, search_text: str,
                    primary_pillar: Optional[str], target_env: Optional[str]) -> int:
        """Domain-constrained candidate scoring. Returns 0 if suppressed or irrelevant."""
        text_lower = search_text.lower()

        # Pillar boundary governance: suppress cross-pillar contamination
        if target_env and target_env in PILLAR_SUPPRESSION:
            if card.pillar in PILLAR_SUPPRESSION[target_env]:
                return 0

        score = 0
        has_match = False

        # 1. Primary products match (highest weight) - whole-token matching
        for prod in card.primary_products:
            p_lower = prod.lower()
            if len(p_lower) >= 3 and _word_boundary_match(p_lower, text_lower):
                score += 8
                has_match = True

        # 2. All products match
        for prod in card.all_products:
            p_lower = prod.lower()
            if len(p_lower) >= 3 and _word_boundary_match(p_lower, text_lower):
                score += 3
                has_match = True

        # 3. Title keyword matching (whole-word only, min 4 chars)
        title_tokens = re.findall(r'[a-z0-9][a-z0-9\-]+', card.title.lower())
        for word in title_tokens:
            if len(word) >= 4 and _word_boundary_match(word, text_lower):
                score += 6
                has_match = True
                break

        # 4. Subheading keyword match (whole-word)
        for sub in card.key_subheadings:
            sub_lower = sub.lower()
            sub_tokens = re.findall(r'[a-z0-9][a-z0-9\-]+', sub_lower)
            for tok in sub_tokens:
                if len(tok) >= 4 and _word_boundary_match(tok, text_lower):
                    score += 3
                    has_match = True
                    break
            if has_match:
                break

        # 5. Industry vertical bonus (only if topical match exists)
        if has_match:
            for ind in card.target_industries:
                if ind.lower() == "enterprise general":
                    continue
                ind_tokens = re.findall(r'[a-z0-9]+', ind.lower())
                for tok in ind_tokens:
                    if len(tok) > 3 and _word_boundary_match(tok, text_lower):
                        score += 4
                        break

        # 6. Pillar affinity bonus
        if has_match and primary_pillar and card.pillar == primary_pillar:
            score += 5

        # 7. Tier 1 boost
        if card.tier == 1 and has_match:
            score += 2

        return score if has_match else 0

    def match_solutions_with_metadata(
        self,
        industry: Optional[str] = None,
        product: Optional[str] = None,
        customer_needs: Optional[str] = None,
        focus_notes: Optional[str] = None,
        limit: int = 4,
    ) -> Tuple[str, List[SolutionCard]]:
        """
        Context-aware semantic matching returning both prompt grounding text AND raw SolutionCard objects.
        Enables direct linkage to UseCaseItem case_study_url and KYC References.
        """
        if not self._cards:
            self._load_catalog()

        search_text = " ".join(filter(None, [industry, product, customer_needs, focus_notes]))
        if not search_text.strip():
            return "", []

        primary_pillar, target_env = _classify_intent(search_text)

        scored = []
        for card in self._cards:
            s = self._score_card(card, search_text, primary_pillar, target_env)
            if s > 0:
                scored.append((s, card))

        if not scored:
            return "", []

        scored.sort(key=lambda x: x[0], reverse=True)
        selected = [c for _, c in scored[:limit]]

        # Format prompt grounding text
        lines = [
            "## Katalog Solusi Resmi & Studi Kasus PT Smartnet Magna Global (Grounding Rujukan):",
            "Gunakan solusi nyata, arsitektur teknis, dan portofolio resmi PT Smartnet Magna Global (SMG) berikut saat merumuskan rekomendasi arsitektur teknis dan use cases:\n"
        ]
        for i, card in enumerate(selected, 1):
            tech_str = ", ".join(card.primary_products) if card.primary_products else "Solusi Enterprise PT Smartnet Magna Global"
            industries_str = ", ".join(card.target_industries)
            lines.append(f"### {i}. {card.title} ({card.pillar})")
            lines.append(f"- **Teknologi Utama**: {tech_str}")
            lines.append(f"- **Target Industri / Skenario**: {industries_str}")
            if card.pain_points:
                lines.append(f"- **Kendala Klien yang Diselesaikan**: {'; '.join(card.pain_points[:2])}")
            if card.key_subheadings:
                lines.append(f"- **Komponen Arsitektur**: {', '.join(card.key_subheadings[:4])}")
            if card.business_impact:
                lines.append(f"- **Dampak Bisnis**: {card.business_impact}")
            if card.source_url:
                lines.append(f"- **Referensi Resmi**: {card.source_url}")
            lines.append("")

        return "\n".join(lines), selected

    def get_solutions_for_prompt(
        self,
        industry: Optional[str] = None,
        product: Optional[str] = None,
        customer_needs: Optional[str] = None,
        limit: int = 4,
    ) -> str:
        """Backward-compatible wrapper returning only the prompt grounding string."""
        prompt_text, _ = self.match_solutions_with_metadata(
            industry=industry, product=product, customer_needs=customer_needs, limit=limit
        )
        return prompt_text



    def get_summary_overview(self) -> str:
        """Overview of 4 SMG solution pillars from Company Profile for conversational chat & KYC system prompt."""
        return """Katalog Portofolio Solusi Resmi PT Smartnet Magna Global (SMG) - Member of CTI Group:
1. Cloud Solution (Cloud Native, Modernization & Hybrid):
   - Google Cloud Platform (Premier Partner: Compute Engine, GKE, Cloud Run, Cloud SQL, Anthos, Vertex AI)
   - Google Workspace (Enterprise Collaboration & Change Management)
   - Google Maps Platform & Amazon Web Services (AWS)
   - 6 Pilar Cloud: Infrastructure Modernization, Application Modernization, Data & DB, AI, Security & Identity, Productivity
2. Data Analytics & AI Solution:
   - Modern Data Warehouse & Processing: Google BigQuery, Greenplum Database, Snowflake, Confluent
   - Real-Time Streaming & Pipeline: Google Cloud Dataflow, Datastream, Pub/Sub, Talend, Cloudera
   - Enterprise AI & Machine Learning: Vertex AI, Gemini AI, Predictive Analytics / Anti-Fraud, BigQuery ML
   - BI & Visualization: Looker Studio Pro, Enterprise Executive Dashboard
   - Managed Services: 24/7 Data Pipeline & ETL Monitoring (SLA 99.9%, MTTR < 25 menit)
3. IT Infrastructure Solution (On-Premises, Hybrid & Edge):
   - Server & Storage Virtualization: Dell Technologies, HPE, Cisco, NetApp, xFusion, Zimbra, Red Hat, Microsoft
   - Hyper-converged Infrastructure (HCI): Nutanix, VMware vSphere / Broadcom Cloud Foundation, Sangfor, Dell EMC
   - Enterprise Wired & Wireless LAN: Cisco Catalyst, Aruba (HPE Networking), Huawei, Extreme Networks (Wi-Fi 6, WPA3, High-Density Switching)
   - Network Performance Monitoring: SolarWinds, Paessler PRTG
   - Backup & Disaster Recovery: Zettagrid, Dell, Veeam
4. Security Management Solution (Multi-Vendor Defense in Depth):
   - Privileged Access & Identity: BeyondTrust PAM (Password Safe), BeyondTrust EPM (Least Privilege/Application Control), RSA, Identity Management
   - Network Security & Perimeter: Fortinet FortiGate (NSE 4 Certified), Palo Alto Networks, Check Point, WatchGuard (NGFW, NAC)
   - Endpoint Security: Next-Gen Antivirus (NGAV), EDR (CrowdStrike Falcon, Trend Micro, Symantec by Broadcom, Sophos, Kaspersky, McAfee, SentinelOne)
   - Cloud Security & SecOps: Google Security Operations (SIEM & SOAR / Chronicle), Google Threat Intelligence / Mandiant, Security Command Center (SCC) Enterprise
5. SMG Professional Services: Implementation, Preventive & Corrective Maintenance, Cloud Managed Services (including 24/7 ETL Monitoring), Cloud Migration Services."""


# Singleton instance
solutions_catalog = SolutionsCatalog()
