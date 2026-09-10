"""
SMG Solutions Catalog & Knowledge Grounding Engine.

Provides centralized, curated solution architectures, tech stacks, and real-world
case studies from PT Smartnet Magna Global for injection into AI KYC pipelines
and Opportunity Chat Assistants.
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)

DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "curated_solutions.json")


@dataclass
class SolutionCard:
    id: str
    title: str
    pillar: str  # Cloud Infrastructure & Modernization, Data Analytics & AI, Cybersecurity Suite, Network & Workplace
    tier: int  # 1 = High-Value Concrete Product/Solution, 2 = Niche Strategic Framework
    primary_products: List[str]
    all_products: List[str]
    target_industries: List[str]
    source_url: str
    key_subheadings: List[str] = field(default_factory=list)
    pain_points: List[str] = field(default_factory=list)
    business_impact: str = ""
    summary_snippet: str = ""


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
    },
    {
        "id": "enterprise-wired-wireless-lan-healthcare-enterprise",
        "title": "Enterprise Wired & Wireless LAN (High-Density Wi-Fi 6 & WPA3)",
        "pillar": "IT Infrastructure Solution",
        "tier": 1,
        "primary_products": ["Cisco", "Aruba", "HPE Networking", "Huawei"],
        "all_products": ["Cisco", "Aruba", "HPE Networking", "Huawei", "Extreme Networks", "Wi-Fi 6", "WPA3", "Core Switch", "Access Point"],
        "target_industries": ["Healthcare & Hospitals", "Enterprise General", "Education & Campus"],
        "source_url": "https://magnaglobal.id/solutions/it-infrastructure-wired-wireless-lan",
        "key_subheadings": [
            "Perancangan High-Density Wireless LAN untuk Lingkungan Kritis (EMR & IoT Medis)",
            "Implementasi Standar Keamanan WPA3 & Segmentasi Jaringan Pasien/Staf",
            "Penyediaan Akses Cepat Wi-Fi 6 untuk Mobilitas Tenaga Medis & Perangkat Klinis",
            "Manajemen Terpusat & Monitoring Performa Jaringan (SolarWinds / PRTG)"
        ],
        "pain_points": [
            "Koneksi nirkabel sering putus (drop) dan lambat saat menangani ratusan perangkat medis dan IoT secara bersamaan.",
            "Risiko kebocoran data rekam medis pasien akibat standar enkripsi nirkabel lama yang belum memenuhi standar kepatuhan regulasi."
        ],
        "business_impact": "Konektivitas nirkabel rumah sakit dan enterprise yang stabil dan aman 99.99%, latency rendah untuk akses EMR real-time, dan kepatuhan standar keamanan data medis.",
        "summary_snippet": "Penyediaan infrastruktur jaringan wired dan wireless LAN enterprise berkecepatan tinggi dengan teknologi Wi-Fi 6 dan enkripsi WPA3 oleh PT Smartnet Magna Global untuk mendukung kelancaran operasional klinis dan korporat."
    },
    {
        "id": "pam-privileged-access-management-banking-assets",
        "title": "Privileged Access Management (PAM) untuk Proteksi Aset Kritis Perbankan",
        "pillar": "Security Management Solution",
        "tier": 1,
        "primary_products": ["BeyondTrust", "PAM", "Password Safe"],
        "all_products": ["BeyondTrust", "PAM", "Password Safe", "Privileged Remote Access", "Session Monitoring"],
        "target_industries": ["FSI / Banking & Multifinance", "Enterprise General"],
        "source_url": "https://magnaglobal.id/solutions/privileged-access-management-pam",
        "key_subheadings": [
            "Sentralisasi Penyimpanan & Rotasi Otomatis Kredensial Administrator",
            "Monitoring & Recording Sesi Akses Privileged Real-Time",
            "Pemberian Akses Berbasis Just-In-Time (JIT) Tanpa Membocorkan Password",
            "Audit Trail Lengkap dan Bukti Kepatuhan Regulasi Finansial (OJK / BI / ISO 27001)"
        ],
        "pain_points": [
            "Banyaknya akun privileged admin bersama (shared credentials) tanpa pencatatan aktivitas yang jelas sehingga rentan insider threat.",
            "Rotasi password server dan database perbankan yang masih dilakukan manual dan tidak konsisten."
        ],
        "business_impact": "Kontrol penuh terhadap seluruh akses akun berhak istimewa, eliminasi kebocoran kredensial root/admin, dan 100% kepatuhan audit regulasi perbankan.",
        "summary_snippet": "Implementasi solusi BeyondTrust Password Safe & Privileged Access Management oleh SMG untuk mengamankan kredensial penting perbankan, merekam sesi server secara real-time, dan mencegah penyalahgunaan hak akses internal."
    },
    {
        "id": "epm-endpoint-privilege-management-corporate",
        "title": "Endpoint Privilege Management (EPM) & Penghapusan Local Admin Korporasi",
        "pillar": "Security Management Solution",
        "tier": 1,
        "primary_products": ["BeyondTrust", "EPM", "Endpoint Privilege Management"],
        "all_products": ["BeyondTrust", "EPM", "Least Privilege", "Application Control", "Zero Trust"],
        "target_industries": ["Enterprise General", "FSI / Banking & Multifinance", "Manufacture Industry"],
        "source_url": "https://magnaglobal.id/solutions/endpoint-privilege-management-epm",
        "key_subheadings": [
            "Pencabutan Hak Local Administrator pada Seluruh Laptop & Workstation Karyawan",
            "Penerapan Just-In-Time Privilege Elevation untuk Tugas Khusus Terverifikasi",
            "Smart Application Control untuk Menjalankan Software Legal dan Memblokir Script Berbahaya",
            "Minimalkan Gangguan Produktivitas Kerja Harian Karyawan"
        ],
        "pain_points": [
            "Karyawan memegang hak local administrator sehingga bebas menginstal software bajakan atau terinfeksi malware ransomware.",
            "Tim IT kewalahan jika mencabut hak admin secara kaku karena dapat menghambat alur kerja karyawan."
        ],
        "business_impact": "Mereduksi risiko infeksi malware dan ransomware endpoint hingga 90% melalui prinsip least privilege tanpa mengorbankan produktivitas kerja pengguna.",
        "summary_snippet": "Implementasi BeyondTrust EPM oleh PT Smartnet Magna Global untuk menghapus hak local admin pada komputer karyawan dengan memberikan izin eskalasi hak akses otomatis berbasis konteks dan aplikasi terpercaya."
    },
    {
        "id": "server-storage-virtualization-hci",
        "title": "Modern On-Premise Server, Storage Virtualization & Hyper-converged Infrastructure (HCI)",
        "pillar": "IT Infrastructure Solution",
        "tier": 1,
        "primary_products": ["Nutanix", "Dell Technologies", "HPE", "VMware", "Sangfor"],
        "all_products": ["Nutanix", "Dell Technologies", "HPE", "VMware vSphere", "Broadcom", "Sangfor", "NetApp", "xFusion", "HCI"],
        "target_industries": ["Enterprise General", "FSI / Banking & Multifinance", "Manufacture Industry", "Healthcare & Hospitals"],
        "source_url": "https://magnaglobal.id/solutions/it-infrastructure-server-storage-hci",
        "key_subheadings": [
            "Konsolidasi Server Fisik dan Storage Menggunakan Arsitektur Hyper-converged (HCI)",
            "Peningkatan Efisiensi Data Center On-Premise dengan Komputasi Kinerja Tinggi",
            "Virtualisasi Tingkat Enterprise dengan VMware vSphere / Nutanix AHV",
            "Solusi Backup, Replikasi Data, dan Disaster Recovery Terintegrasi"
        ],
        "pain_points": [
            "Server on-premise lama (legacy hardware) yang mendekati masa End-of-Life (EOL), boros listrik/ruang rack, dan berbiaya maintenance tinggi.",
            "Kompleksitas pengelolaan silo komputasi, SAN storage, dan jaringan yang terpisah-pisah."
        ],
        "business_impact": "Pengurangan jejak footprint data center hingga 60%, efisiensi CAPEX/OPEX hingga 45%, serta ketersediaan sistem (high availability) 99.99% tanpa downtime.",
        "summary_snippet": "Penyediaan, integrasi, dan pemeliharaan server fisik enterprise, storage all-flash, dan arsitektur HCI (Nutanix / Dell / HPE / VMware / Sangfor) oleh PT Smartnet Magna Global untuk infrastruktur data center on-premise yang tangguh."
    },
    {
        "id": "next-generation-firewall-network-security",
        "title": "Next-Generation Firewall (NGFW) & Perimeter Threat Prevention",
        "pillar": "Security Management Solution",
        "tier": 1,
        "primary_products": ["Fortinet", "FortiGate", "Palo Alto Networks", "Check Point"],
        "all_products": ["Fortinet", "FortiGate", "Palo Alto Networks", "Check Point", "NGFW", "IPS", "VPN", "Network Access Control"],
        "target_industries": ["Enterprise General", "FSI / Banking & Multifinance", "Retail & Manufacture"],
        "source_url": "https://magnaglobal.id/solutions/security-next-generation-firewall",
        "key_subheadings": [
            "Inspeksi Mendalam Lalu Lintas Jaringan (Deep Packet Inspection & SSL/TLS Decryption)",
            "Pencegahan Intrusi Berkelanjutan (Intrusion Prevention System - IPS)",
            "Segmentasi Jaringan Internal Berbasis Keamanan Tingkat Lanjut",
            "Sentralisasi Manajemen Firewall Multi-Site & Secure SD-WAN"
        ],
        "pain_points": [
            "Firewall konvensional lama tidak mampu membaca payload terenkripsi dan mendeteksi ancaman modern tingkat aplikasi (Layer 7).",
            "Beban operasional mengelola puluhan firewall di cabang yang terdistribusi secara manual."
        ],
        "business_impact": "Perlindungan perimeter 100% terhadap lalu lintas berbahaya, isolasi otomatis ancaman lateral di jaringan lokal, dan visibilitas total aktivitas bandwidth aplikasi.",
        "summary_snippet": "Implementasi NGFW enterprise menggunakan Fortinet FortiGate dan Palo Alto Networks oleh tim bersertifikasi SMG (NSE 4 / Certified Professional) untuk memperkuat perimeter dan segmentasi jaringan korporat."
    },
    {
        "id": "etl-monitoring-managed-services",
        "title": "24/7 Managed Services & Data Pipeline (ETL) Monitoring",
        "pillar": "Data Analytics & AI",
        "tier": 1,
        "primary_products": ["Greenplum Database", "Talend", "Cloudera"],
        "all_products": ["Greenplum", "Talend", "Cloudera", "Managed Services", "ETL Monitoring", "Data Pipeline"],
        "target_industries": ["FSI / Banking & Multifinance", "Enterprise General"],
        "source_url": "https://magnaglobal.id/solutions/managed-services-etl-monitoring",
        "key_subheadings": [
            "Monitoring Proaktif 24/7 untuk Ratusan Pipeline ETL Misi-Kritis",
            "Otomasi Diagnostik Error & Penanganan Insiden Pipeline Data",
            "Kepatuhan SLA Pemrosesan Data Harian Perbankan (99.9%)",
            "Pengurangan MTTR (Mean Time to Resolution) di Bawah 25 Menit"
        ],
        "pain_points": [
            "Keterbatasan staf IT internal dalam memantau ratusan pipeline ETL harian yang sering gagal tanpa pemberitahuan dini.",
            "Keterlambatan data batch harian yang mengganggu pelaporan regulasi perbankan dan keputusan bisnis."
        ],
        "business_impact": "85% penurunan kegagalan kritis pipeline data, pemenuhan SLA 99.9%, dan menghemat hingga 400 jam kerja tim IT internal per bulan.",
        "summary_snippet": "Layanan 24/7 Managed Services dari PT Smartnet Magna Global untuk pemantauan dan troubleshooting proaktif pipeline ETL enterprise berbasis Greenplum, Talend, dan Cloudera di industri perbankan."
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

    def get_solutions_for_prompt(
        self,
        industry: Optional[str] = None,
        product: Optional[str] = None,
        customer_needs: Optional[str] = None,
        limit: int = 4,
    ) -> str:
        """
        Match and return the most relevant SMG solution cards formatted for LLM Prompt Grounding.
        Scores solutions based on industry vertical, target product match, and keywords in customer needs.
        """
        if not self._cards:
            self._load_catalog()

        scored_cards = []
        raw_search = f"{industry or ''} {product or ''} {customer_needs or ''}".lower()
        norm_search = raw_search.replace("-", " ")
        norm_search_compact = raw_search.replace("-", "")

        for card in self._cards:
            score = 0
            has_topical_match = False

            # 1. Primary products match (highest weight)
            for prod in card.primary_products:
                p_lower = prod.lower()
                p_norm = p_lower.replace("-", " ")
                p_compact = p_lower.replace("-", "")
                if (p_lower in raw_search or p_norm in norm_search or p_compact in norm_search_compact):
                    score += 8
                    has_topical_match = True

            # 2. All products match
            for prod in card.all_products:
                p_lower = prod.lower()
                p_norm = p_lower.replace("-", " ")
                p_compact = p_lower.replace("-", "")
                if (p_lower in raw_search or p_norm in norm_search or p_compact in norm_search_compact):
                    score += 3
                    has_topical_match = True

            # 3. Card Title keyword matching
            clean_title = card.title.lower().replace("&", " ").replace("/", " ").replace("(", " ").replace(")", " ")
            for word in clean_title.split():
                if len(word) > 3:
                    w_norm = word.replace("-", " ")
                    w_compact = word.replace("-", "")
                    if (word in raw_search or w_norm in norm_search or w_compact in norm_search_compact or (len(word) > 5 and word[:5] in raw_search)):
                        score += 6
                        has_topical_match = True
                        break

            # 4. Subheadings & technical keywords across all 4 pillars
            infra_keywords = [
                "server", "compute", "virtualiz", "virtualis", "vmware", "gke", "cloud run",
                "nutanix", "switch", "network", "firewall", "wifi", "wi fi", "storage", "backup",
                "disaster recovery", "migrasi", "migration", "database", "dataflow",
                "bigquery", "predictive", "fraud", "streaming", "ransomware", "antivirus",
                "zero trust", "scc", "pam", "epm", "iam", "endpoint", "infrastructure",
                "cisco", "aruba", "fortinet", "beyondtrust", "dell", "hpe", "huawei",
                "palo alto", "greenplum", "talend", "cloudera", "sangfor", "solarwinds",
                "prtg", "wireless", "lan", "ngfw", "edr", "broadcom", "wpa3", "local admin"
            ]
            for sub in card.key_subheadings:
                sub_lower = sub.lower()
                for kw in infra_keywords:
                    if kw in sub_lower and (kw in raw_search or kw in norm_search or kw.replace(" ", "") in norm_search_compact):
                        score += 3
                        has_topical_match = True

            # 5. Industry match (Only provide vertical bonus if there is a topical product/need match)
            for ind in card.target_industries:
                if ind.lower() != "enterprise general" and any(k in raw_search for k in ind.lower().split() if len(k) > 3):
                    score += 4

            # 6. Tier 1 boost
            if card.tier == 1 and has_topical_match:
                score += 2

            if has_topical_match and score > 0:
                scored_cards.append((score, card))

        # If no curated solutions matched, do not inject unrelated solutions into the prompt
        if not scored_cards:
            return ""

        # Sort descending by relevance score
        scored_cards.sort(key=lambda x: x[0], reverse=True)
        selected = [c for _, c in scored_cards[:limit]]

        # Format into clean, high-density prompt grounding context
        output_lines = [
            "## Katalog Solusi Resmi & Studi Kasus PT Smartnet Magna Global (Grounding Rujukan):",
            "Gunakan solusi nyata, arsitektur teknis, dan portofolio resmi PT Smartnet Magna Global (SMG) berikut saat merumuskan rekomendasi arsitektur teknis dan use cases:\n"
        ]

        for i, card in enumerate(selected, 1):
            tech_str = ", ".join(card.primary_products) if card.primary_products else "Solusi Enterprise PT Smartnet Magna Global"
            industries_str = ", ".join(card.target_industries)
            output_lines.append(f"### {i}. {card.title} ({card.pillar})")
            output_lines.append(f"- **Teknologi Utama**: {tech_str}")
            output_lines.append(f"- **Target Industri / Skenario**: {industries_str}")
            if card.pain_points:
                output_lines.append(f"- **Kendala Klien yang Diselesaikan**: {'; '.join(card.pain_points[:2])}")
            if card.key_subheadings:
                output_lines.append(f"- **Komponen Arsitektur**: {', '.join(card.key_subheadings[:4])}")
            if card.business_impact:
                output_lines.append(f"- **Dampak Bisnis**: {card.business_impact}")
            if card.source_url:
                output_lines.append(f"- **Referensi Resmi**: {card.source_url}")
            output_lines.append("")

        return "\n".join(output_lines)

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
