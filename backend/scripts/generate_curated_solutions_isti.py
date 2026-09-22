"""
Builder for curated_solutions_isti.json - Part 1: imports, constants, schema validation.
"""
import json
import os

SCHEMA_PILLARS = {
    "Cybersecurity Suite",
    "Cloud Infrastructure & Modernization",
    "Data Analytics & AI",
    "Network & Enterprise Workplace"
}

SCHEMA_DOMAINS = {
    "privileged_access_management",
    "endpoint_security",
    "cloud_infrastructure",
    "kubernetes_modernization",
    "data_analytics_ai",
    "network_firewall_zero_trust",
    "campus_lan_wireless",
    "backup_disaster_recovery",
    "compliance_governance",
    "general_enterprise_it",
    "enterprise_workplace",
    "location_geospatial"
}

SCHEMA_REGULATIONS = {"ojk", "bi", "uu_pdp", "pci_dss", "iso27001", "none"}
SCHEMA_ENVIRONMENTS = {"on_premise", "cloud", "hybrid", "campus_lan", "unspecified"}
SOLUTIONS.extend([
    {
        "id": "privileged-access-management-pam",
        "title": "Privileged Access Management (PAM)",
        "pillar": "Cybersecurity Suite",
        "tier": 2,
        "solution_domain": "privileged_access_management",
        "regulatory_compliance": ["ojk", "bi", "uu_pdp", "pci_dss", "iso27001"],
        "target_environment": "hybrid",
        "primary_products": ["BeyondTrust", "CyberArk"],
        "all_products": ["BeyondTrust", "CyberArk", "Senhasegura", "Delinea", "One Identity"],
        "target_industries": ["FSI / Banking & Multifinance", "Enterprise General", "Public Sector & BUMN"],
        "source_url": "https://magnaglobal.id/solutions/privileged-access-management-pam",
        "pain_points": [
            "Banyaknya perangkat server, endpoint, dan network membuat tim admin sering lupa atau saling berbagi password (shared password/credential pooling).",
            "Aktivitas admin internal dan vendor pihak ketiga tidak terpantau secara detail sehingga menimbulkan celah fraud dan kegagalan audit regulasi.",
            "Kredensial akun superuser/root dibiarkan statis tanpa kebijakan rotasi otomatis berkala."
        ],
        "key_subheadings": [
            "Enterprise Credential Vaulting & Automatic Password Rotation",
            "Real-Time Session Monitoring & Keystroke/Video Recording",
            "Least Privilege Access & Ephemeral Just-in-Time Privileges",
            "Secure Third-Party & Vendor Remote Access"
        ],
        "business_impact": "Menghilangkan risiko pencurian kredensial superuser, mencegah unauthorized changes pada server kritis, dan menjamin 100% pemenuhan audit regulasi Bank Indonesia/OJK.",
        "summary_snippet": "Manajemen dan pengawasan hak akses istimewa terpusat dengan brankas sandi otomatis, pencatatan sesi end-to-end, dan pemantauan real-time untuk mencegah penyalahgunaan akun privileged.",
        "probing_questions": [
            "Bagaimana pembagian dan pengelolaan password akses admin server dan network saat ini, apakah masih menggunakan shared password atau dicatat manual?",
            "Bagaimana cara memantau dan mengaudit aktivitas vendor pihak ketiga saat melakukan remote maintenance pada server core?",
            "Berapa lama waktu yang dibutuhkan untuk merotasi password administrator di seluruh armada server saat ada admin yang resign?"
        ],
        "battlecard_ammo": {
            "key_differentiators": "BeyondTrust & CyberArk menyediakan session recording lengkap (keystroke & video playback), otomatis inject password tanpa menampilkan teks sandi kepada user, dan rotasi otomatis pasca sesi.",
            "objection_handling": "Jika klien menganggap PAM memperlambat kerja tim IT: PAM justru mengeliminasi proses mengingat sandi rumit; admin cukup checkout izin akses melalui satu pintu terintegrasi MFA.",
            "market_stats": "80% pelanggaran keamanan data melibatkan penyalahgunaan kredensial berhak akses istimewa (privileged credentials)."
        }
    },
    {
        "id": "endpoint-privilege-management-epm",
        "title": "Endpoint Privilege Management (EPM)",
        "pillar": "Cybersecurity Suite",
        "tier": 2,
        "solution_domain": "privileged_access_management",
        "regulatory_compliance": ["ojk", "uu_pdp", "iso27001"],
        "target_environment": "hybrid",
        "primary_products": ["BeyondTrust"],
        "all_products": ["BeyondTrust", "Delinea"],
        "target_industries": ["Enterprise General", "FSI / Banking & Multifinance", "Manufacture Industry"],
        "source_url": "https://magnaglobal.id/solutions/endpoint-privilege-management-epm",
        "pain_points": [
            "Laptop/workstation karyawan masih memegang hak akses administrator lokal (local admin privilege), memicu instalasi software ilegal atau malware.",
            "Ketiadaan kontrol terhadap penggunaan media eksternal (disable USB storage, printer, peripheral) pada perangkat inventaris kantor.",
            "Pengguna sembarangan mengubah konfigurasi sistem operasi dan mengabaikan compliance internal perusahaan."
        ],
        "key_subheadings": [
            "Removal of Local Administrative Rights on Endpoints",
            "Application Allowlisting & Privilege Elevation per Application",
            "Peripheral & USB Storage Lockdown Control",
            "Endpoint Policy Compliance & OS Hardening"
        ],
        "business_impact": "Meniadakan serangan berbasis eskalasi hak istimewa di endpoint, membatasi kebocoran data lewat USB, dan memastikan kepatuhan konfigurasi aset laptop.",
        "summary_snippet": "Solusi kontrol hak istimewa endpoint untuk mencabut akses admin lokal, menerapkan prinsip least privilege berbasis aplikasi, dan mengunci peripheral fisik seperti USB dan printer.",
        "probing_questions": [
            "Apakah karyawan di laptop kantor saat ini masih memegang hak administrator lokal penuh?",
            "Bagaimana perusahaan membatasi instalasi software tak berizin atau penggunaan flashdisk pada laptop inventaris yang dipinjamkan ke staf?",
            "Bagaimana tim IT menangani permintaan instalasi software kerja tanpa harus memberikan credential administrator penuh kepada user?"
        ],
        "battlecard_ammo": {
            "key_differentiators": "BeyondTrust EPM mengizinkan 'privilege elevation' hanya untuk aplikasi spesifik yang disetujui, tanpa perlu memberikan akses admin penuh kepada user workstation.",
            "objection_handling": "Jika user mengeluh tidak leluasa bekerja tanpa admin: EPM otomatis memberikan hak eksekusi aplikasi kerja yang legitimate secara seamless tanpa intervensi manual tim helpdesk.",
            "market_stats": "Mencabut hak admin lokal mampu memitigasi hingga 85% kerentanan kritis sistem operasi Windows (Microsoft Vulnerability Research)."
        }
    }
])


SOLUTIONS = []

SOLUTIONS.append({
    "id": "next-gen-endpoint-security-edr",
    "title": "Next-Generation Endpoint Protection Platform (EPP) & EDR",
    "pillar": "Cybersecurity Suite",
    "tier": 2,
    "solution_domain": "endpoint_security",
    "regulatory_compliance": ["ojk", "bi", "uu_pdp", "iso27001", "pci_dss"],
    "target_environment": "hybrid",
    "primary_products": ["CrowdStrike Falcon", "SentinelOne"],
    "all_products": ["CrowdStrike", "SentinelOne", "Trellix", "Trend Micro", "Sophos", "Kaspersky"],
    "target_industries": ["FSI / Banking & Multifinance", "Enterprise General", "Healthcare & Hospitals", "Manufacture Industry"],
    "source_url": "https://magnaglobal.id/solutions/endpoint-security-edr-xdr",
    "pain_points": [
        "Antivirus tradisional berbasis signature (IOC) lambat, boros RAM/CPU saat full-scan, dan gagal menahan serangan zero-day atau malware-free attacks.",
        "Agen antivirus konvensional membutuhkan reboot server/laptop setiap pembaruan signature, mengganggu kontinuitas operasional.",
        "Kurangnya kemampuan isolasi otomatis perangkat endpoint yang terinfeksi dan ketidakmampuan threat hunting proaktif."
    ],
    "key_subheadings": [
        "Behavioral Indicator of Attack (IOA) Detection",
        "Single Lightweight Agent (12MB RAM, Zero Reboot)",
        "Autonomous Threat Remediation & Network Containment",
        "Full SaaS Cloud-Native Telemetry Architecture",
        "Cross-Platform Support (Windows, Linux, macOS)"
    ],
    "business_impact": "Mencegah ransomware dan serangan lateral movement, menghemat resource komputasi endpoint, serta memberikan visibilitas ancaman 24/7.",
    "summary_snippet": "Perlindungan endpoint modern berbasis kecerdasan buatan dan Indicator of Attack (IOA) dengan satu agen ultra-ringan tanpa signature update berkala.",
    "probing_questions": [
        "Apakah antivirus yang digunakan saat ini sering membuat laptop atau server menjadi lambat karena proses scanning berkala?",
        "Bagaimana pengalaman tim saat menghadapi serangan baru, apakah solusi existing masih bergantung pada signature update harian?",
        "Berapa lama waktu yang dibutuhkan tim IT untuk mengisolasi workstation yang terindikasi terkena malware?"
    ],
    "battlecard_ammo": {
        "key_differentiators": "CrowdStrike Falcon hanya menggunakan single lightweight agent (12 MB RAM, konsumsi memori ~1%), tanpa reboot instalasi selamanya, fully cloud-native, serta deteksi berbasis IOA (Indicator of Attack) bukan signature IOC lama. SentinelOne memiliki keunggulan autonomous rollback 1-klik.",
        "objection_handling": "Jika perbankan/FSI menolak cloud karena alasan privasi data: Cloud CrowdStrike HANYA menyimpan data telemetri aktivitas sistem (apakah proses dijalankan manusia atau skrip otomatis), TIDAK PERNAH menyimpan, membaca, atau mengunggah data pribadi, file, maupun data nasabah. Lebih aman dibanding on-prem yang rawan celah patch!",
        "market_stats": "75% serangan siber modern bersifat malware-free (bebas malware) dan mengandalkan pencurian kredensial serta Living-off-the-Land (LotL) tactics yang tidak terdeteksi oleh antivirus signature."
    }
})
