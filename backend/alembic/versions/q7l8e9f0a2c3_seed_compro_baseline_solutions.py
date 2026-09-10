"""seed compro baseline solutions into master_solutions

Revision ID: q7l8e9f0a2c3
Revises: p6k7e8f9a0b1
Create Date: 2026-09-10 10:00:00

"""
import json
import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'q7l8e9f0a2c3'
down_revision: Union[str, None] = 'p6k7e8f9a0b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

COMPRO_SOLUTIONS = [
    {
        "slug": "enterprise-wired-wireless-lan-healthcare-enterprise",
        "title": "Enterprise Wired & Wireless LAN (High-Density Wi-Fi 6 & WPA3)",
        "pillar": "IT Infrastructure Solution",
        "tier": 1,
        "primary_products": ["Cisco", "Aruba", "HPE Networking", "Huawei", "Wi-Fi 6", "WiFi", "Wireless LAN"],
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
        "slug": "pam-privileged-access-management-banking-assets",
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
        "slug": "epm-endpoint-privilege-management-corporate",
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
        "slug": "server-storage-virtualization-hci",
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
        "slug": "next-generation-firewall-network-security",
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
        "slug": "etl-monitoring-managed-services",
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


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'master_solutions' in tables:
        for s in COMPRO_SOLUTIONS:
            conn.execute(
                sa.text("""
                    INSERT INTO master_solutions (
                        id, slug, title, pillar, tier, primary_products, all_products,
                        target_industries, key_subheadings, pain_points, business_impact,
                        summary_snippet, source_url, is_active, created_at, updated_at
                    ) VALUES (
                        :id, :slug, :title, :pillar, :tier, CAST(:primary_products AS jsonb), CAST(:all_products AS jsonb),
                        CAST(:target_industries AS jsonb), CAST(:key_subheadings AS jsonb), CAST(:pain_points AS jsonb), :business_impact,
                        :summary_snippet, :source_url, :is_active, NOW(), NOW()
                    )
                    ON CONFLICT (slug) DO UPDATE SET
                        title = EXCLUDED.title,
                        pillar = EXCLUDED.pillar,
                        tier = EXCLUDED.tier,
                        primary_products = EXCLUDED.primary_products,
                        all_products = EXCLUDED.all_products,
                        target_industries = EXCLUDED.target_industries,
                        key_subheadings = EXCLUDED.key_subheadings,
                        pain_points = EXCLUDED.pain_points,
                        business_impact = EXCLUDED.business_impact,
                        summary_snippet = EXCLUDED.summary_snippet,
                        source_url = EXCLUDED.source_url,
                        is_active = EXCLUDED.is_active,
                        updated_at = NOW()
                """),
                {
                    "id": str(uuid.uuid4()),
                    "slug": s["slug"],
                    "title": s["title"],
                    "pillar": s["pillar"],
                    "tier": s["tier"],
                    "primary_products": json.dumps(s["primary_products"]),
                    "all_products": json.dumps(s["all_products"]),
                    "target_industries": json.dumps(s["target_industries"]),
                    "key_subheadings": json.dumps(s["key_subheadings"]),
                    "pain_points": json.dumps(s["pain_points"]),
                    "business_impact": s["business_impact"],
                    "summary_snippet": s["summary_snippet"],
                    "source_url": s["source_url"],
                    "is_active": True,
                }
            )


def downgrade() -> None:
    conn = op.get_bind()
    for s in COMPRO_SOLUTIONS:
        conn.execute(
            sa.text("DELETE FROM master_solutions WHERE slug = :slug"),
            {"slug": s["slug"]}
        )
