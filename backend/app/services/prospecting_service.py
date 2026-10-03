"""Prospecting Service.

Handles synthesis of consultative sales hypotheses, Magna solutions catalog matching,
outreach copy generation (WA, Email, LinkedIn), and conversion of prospects into
active Opportunities, Companies, and CompanyContacts in the MOIP database.
"""

from __future__ import annotations

import logging
import re
import uuid
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func

from app.models.company import Company
from app.models.company_contact import CompanyContact
from app.models.opportunity import Opportunity, TimelineEvent
from app.models.user import User
from app.api.companies import compute_normalized_name
from app.schemas.prospecting import (
    ProspectingGenerateRequest,
    ProspectingGenerateResponse,
    SolutionHypothesis,
    OutreachCopy,
    ProspectingConvertRequest,
    ProspectingConvertResponse,
    ConvertStakeholdersToOpportunityRequest,
    ConvertToOpportunityResponse,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Magna Solutions Catalog & Domain Intelligence Mapping
# Grounded to the 8 official solutions in DEFAULT_TARGET_SOLUTIONS and solutions_catalog.py
# ---------------------------------------------------------------------------

TARGET_SOLUTIONS_CATALOG: Dict[str, Dict[str, Any]] = {
    "Data Analytics Platform": {
        "pillar": "Data Analytics & AI",
        "pillar_key": "data",
        "solution": "Data Analytics Platform",
        "tech_stack": ["Google BigQuery", "Databricks", "Dataflow", "Cloud Composer", "Looker", "dbt"],
        "pain_points": [
            "Silo data lintas departemen yang menghambat terciptanya Single Source of Truth bagi manajemen.",
            "Proses ETL/data ingestion lambat dan query pelaporan BI yang lamban pada volume data transaksi besar.",
            "Tingginya biaya operasional data warehouse legacy on-premise tanpa kemampuan auto-scaling.",
        ],
        "benefits": [
            "Konsolidasi data lakehouse modern dengan kecepatan query analitik real-time berbasis serverless BigQuery.",
            "Reduksi waktu pembuatan pipeline data analitik dari berminggu-minggu menjadi hitungan jam dengan dbt & Dataflow.",
            "Efisiensi TCO storage dan komputasi analitik hingga 40% dengan arsitektur decoupled storage-compute.",
        ],
        "discovery_questions": [
            "Bagaimana arsitektur data warehouse Anda saat ini menangani lonjakan volume data transaksi harian?",
            "Berapa lama rata-rata waktu yang dibutuhkan untuk menyajikan dashboard laporan baru ke tim bisnis?",
            "Apakah tim saat ini mengalami tantangan silo data antar sistem operasional dan analitik?",
        ],
    },
    "AI/ML Solutions": {
        "pillar": "Data Analytics & AI",
        "pillar_key": "data",
        "solution": "AI/ML Solutions",
        "tech_stack": ["Google Vertex AI", "Gemini Enterprise", "BigQuery ML", "AutoML", "Document AI"],
        "pain_points": [
            "Kesulitan mengintegrasikan model machine learning ke sistem produksi bisnis yang berjalan secara aman.",
            "Proses ekstraksi dokumen & verifikasi data manual (seperti KYC, invoice, PO) yang memakan waktu dan rentan human error.",
            "Kekhawatiran keamanan dan kepatuhan privasi data perusahaan saat mengadopsi AI generatif.",
        ],
        "benefits": [
            "Akselerasi deployment model ML enterprise dengan platform MLOps terkelola penuh di Vertex AI.",
            "Otomatisasi pengolahan dokumen bisnis dengan akurasi tinggi menggunakan Document AI & multimodal Gemini.",
            "Pemanfaatan model AI privat dengan kepatuhan penuh terhadap data sovereignty dan enterprise governance.",
        ],
        "discovery_questions": [
            "Proses bisnis apa di perusahaan Anda yang saat ini masih sangat bergantung pada pemrosesan dokumen manual?",
            "Bagaimana rencana atau inisiatif adopsi Generative AI di divisi Anda dalam 6-12 bulan ke depan?",
            "Apakah tim data science Anda menghadapi kendala infrastruktur saat melakukan training dan deployment model ML?",
        ],
    },
    "Google Workspace (GWS)": {
        "pillar": "Network & Enterprise Workplace",
        "pillar_key": "network",
        "solution": "Google Workspace (GWS)",
        "tech_stack": ["Google Workspace Enterprise", "Gmail Enterprise", "Google Drive DLP", "Google Meet", "Gemini for Workspace", "Google Vault"],
        "pain_points": [
            "Sistem email legacy (Zimbra/on-premise Exchange) yang sering mengalami downtime, spam tinggi, dan biaya maintenance server besar.",
            "Tantangan kolaborasi real-time dan sharing dokumen antar karyawan di era kerja hybrid yang belum tersentralisasi aman.",
            "Risiko kebocoran data sensitif perusahaan saat dikirim via email atau media penyimpanan cloud pihak ketiga tanpa proteksi DLP.",
        ],
        "benefits": [
            "Jaminan 99.9% uptime SLA tanpa maintenance downtime berkala dengan proteksi anti-spam & phishing AI terdepan.",
            "Peningkatan produktivitas kolaborasi hingga 171 jam per karyawan per tahun melalui integrasi Google Docs, Sheets, Meet, dan Gemini AI.",
            "Tata kelola kepatuhan dan audit retensi data terpusat menggunakan Google Vault dan Data Loss Prevention (DLP).",
        ],
        "discovery_questions": [
            "Platform email dan produktivitas apa yang digunakan organisasi saat ini, dan apakah ada kendala reliabilitas atau spam?",
            "Apakah ada rencana modernisasi atau migrasi dari platform email on-premise (Zimbra/Exchange) ke cloud?",
            "Bagaimana mekanisme perusahaan saat ini dalam mencegah kebocoran dokumen sensitif dan memenuhi audit retensi data?",
        ],
    },
    "Google Maps Platform (GMaps)": {
        "pillar": "Cloud Infrastructure & Modernization",
        "pillar_key": "cloud",
        "solution": "Google Maps Platform (GMaps)",
        "tech_stack": ["Google Maps Platform", "Routes API & Fleet Engine", "Places API", "Geocoding API", "Distance Matrix API", "Location Intelligence"],
        "pain_points": [
            "Inakurasi perhitungan rute, estimasi waktu tiba (ETA), dan rute logistik armada pengiriman yang memboroskan bahan bakar dan waktu.",
            "Tingginya kegagalan pengiriman akibat salah alamat atau validasi lokasi titik pengantaran pelanggan yang tidak presisi.",
            "Kurangnya visibilitas visual real-time terhadap sebaran aset, outlet cabang, atau armada kendaraan di lapangan.",
        ],
        "benefits": [
            "Optimalisasi rute armada multi-stop dengan Google Fleet Engine & Routes API, memangkas biaya bahan bakar hingga 15-20%.",
            "Peningkatan akurasi verifikasi alamat hingga 99% menggunakan Places Autocomplete & Geocoding global terakurat.",
            "Dashboard location intelligence real-time untuk pemantauan pergerakan armada dan performa SLA pengiriman.",
        ],
        "discovery_questions": [
            "Bagaimana aplikasi Anda saat ini memvalidasi alamat pelanggan atau menentukan titik penjemputan/pengantaran?",
            "Apakah tim logistik/operasional menghadapi kendala dalam optimasi rute armada pengiriman multi-titik?",
            "Apakah akurasi estimasi waktu tiba (ETA) saat ini menjadi faktor penting dalam kepuasan pelanggan atau SLA operasional Anda?",
        ],
    },
    "Cloud Infrastructure (GCP)": {
        "pillar": "Cloud Infrastructure & Modernization",
        "pillar_key": "cloud",
        "solution": "Cloud Infrastructure (GCP)",
        "tech_stack": ["Google Cloud Platform (GCP)", "Google Kubernetes Engine (GKE)", "Cloud Run", "Anthos Hybrid", "Cloud Spanner", "Cloud Storage"],
        "pain_points": [
            "Infrastruktur on-premise yang kaku dan sulit diskalakan saat terjadi lonjakan traffic aplikasi secara tiba-tiba.",
            "Tingginya biaya lisensi software infrastruktur legacy dan lambatnya siklus rilis fitur aplikasi baru.",
            "Kompleksitas operasional pengelolaan cluster Kubernetes mandiri tanpa managed service yang andal.",
        ],
        "benefits": [
            "Skalabilitas elastis otomatis dengan Google Kubernetes Engine (GKE) untuk mengakomodasi jutaan concurrent users.",
            "Percepatan time-to-market deployment aplikasi modern berbasis serverless Cloud Run dan CI/CD cloud native.",
            "Efisiensi biaya komputasi dengan sustained use discounts dan komitmen resource fleksibel di Google Cloud.",
        ],
        "discovery_questions": [
            "Bagaimana infrastruktur aplikasi utama Anda saat ini menangani lonjakan traffic di momen puncak transaksi?",
            "Apakah perusahaan memiliki rencana modernisasi aplikasi menuju microservices atau migrasi ke platform public cloud?",
            "Berapa lama siklus rilis fitur aplikasi dari tahap development hingga masuk ke tahap live production saat ini?",
        ],
    },
    "Enterprise Server & Compute": {
        "pillar": "Cloud Infrastructure & Modernization",
        "pillar_key": "cloud",
        "solution": "Enterprise Server & Compute",
        "tech_stack": ["Dell PowerEdge Servers", "HPE ProLiant", "Nutanix Cloud Platform (HCI)", "VMware vSphere Modernization", "SAN/NAS Enterprise Storage"],
        "pain_points": [
            "Server fisik data center eksisting yang mendekati End-of-Life (EoL) dengan biaya maintenance kontrak tahunan yang melonjak.",
            "Kenaikan drastis biaya lisensi virtualisasi legacy setelah perubahan skema lisensi vendor.",
            "Keterbatasan kapasitas compute dan storage on-premise untuk memenuhi regulasi data residency lokal.",
        ],
        "benefits": [
            "Modernisasi data center menggunakan Hyperconverged Infrastructure (HCI) yang memangkas footprint rak server dan konsumsi listrik.",
            "Alternatif virtualisasi enterprise bebas kenaikan lisensi agresif dengan Nutanix AHV yang teruji performanya.",
            "Kinerja komputasi tinggi generasi terbaru Dell/HPE dengan dukungan garansi dan SLA enterprise lokal 24/7.",
        ],
        "discovery_questions": [
            "Kapan siklus hardware refresh server dan storage data center Anda berikutnya direncanakan?",
            "Bagaimana dampak perubahan skema lisensi virtualisasi legacy terhadap anggaran IT perusahaan Anda?",
            "Apakah ada kebutuhan mempertahankan workload tertentu di data center lokal untuk mematuhi regulasi data sovereignty?",
        ],
    },
    "Cybersecurity Suite": {
        "pillar": "Cybersecurity Suite",
        "pillar_key": "security",
        "solution": "Cybersecurity Suite",
        "tech_stack": ["BeyondTrust Privileged Access Management (PAM)", "BeyondTrust Endpoint Privilege Management (EPM)", "Palo Alto Networks NGFW", "Fortinet Security Fabric", "Chronicle SIEM / Managed SOC"],
        "pain_points": [
            "Blindspot keamanan pada pengelolaan akun privilese (root, admin, vendor eksternal) yang berisiko disalahgunakan.",
            "Kebutuhan mendesak memenuhi standar kepatuhan regulasi perlindungan data pribadi (UU PDP, OJK, ISO 27001).",
            "Kelelahan tim security (alert fatigue) akibat banyaknya notifikasi ancaman tanpa korelasi dan respons otomatis.",
        ],
        "benefits": [
            "Eliminasi credential sharing dan penegakan prinsip Least Privilege secara ketat dengan BeyondTrust PAM/EPM.",
            "Deteksi dan respons ancaman siber berbasis AI dengan visibilitas telemetri komprehensif 24/7.",
            "Laporan audit kepatuhan otomatis yang siap diaudit untuk regulasi OJK, Bank Indonesia, dan UU PDP.",
        ],
        "discovery_questions": [
            "Bagaimana mekanisme tim Anda saat ini dalam mengontrol dan merekam aktivitas akses pengguna dengan hak privilese tinggi?",
            "Bagaimana kesiapan infrastruktur IT perusahaan Anda dalam memenuhi persyaratan audit UU Perlindungan Data Pribadi (PDP)?",
            "Berapa rata-rata waktu yang dibutuhkan untuk mendeteksi dan mengisolasi potensi insiden keamanan siber saat ini?",
        ],
    },
    "Network Solutions": {
        "pillar": "Network & Enterprise Workplace",
        "pillar_key": "network",
        "solution": "Network Solutions",
        "tech_stack": ["Cisco Catalyst / Meraki", "Aruba CX Enterprise Switching", "HPE Aruba Wi-Fi 6/6E", "Fortinet Secure SD-WAN", "Network Monitoring"],
        "pain_points": [
            "Latensi tinggi dan kualitas konektivitas tidak stabil antar kantor cabang dengan data center/cloud.",
            "Tingginya biaya leased line konvensional tanpa adanya load balancing cerdas antar penyedia bandwidth.",
            "Kompleksitas manajemen perangkat switch, router, dan access point yang tersebar di banyak lokasi cabang.",
        ],
        "benefits": [
            "Optimasi performa aplikasi bisnis cabang dengan Intelligent Dynamic Path Steering melalui SD-WAN.",
            "Penyederhanaan manajemen jaringan cabang melalui Cloud-Managed Networking dengan konfigurasi Zero-Touch Provisioning.",
            "Infrastruktur Wi-Fi 6 enterprise berkecepatan tinggi dengan segmentasi akses aman untuk karyawan dan tamu.",
        ],
        "discovery_questions": [
            "Bagaimana performa konektivitas jaringan kantor cabang ke aplikasi sentral saat ini, apakah sering mengalami keluhan latensi?",
            "Berapa lama waktu yang dibutuhkan tim jaringan untuk setup dan online-kan perangkat jaringan di cabang baru?",
            "Apakah alokasi bandwidth jaringan Anda saat ini sudah bisa memprioritaskan aplikasi transaksi kritis secara otomatis?",
            "Bagaimana visibilitas tim IT Anda terhadap anomali performa jaringan dan status perangkat di seluruh kantor cabang secara real-time?",
        ],
    },
}

# Legacy pillar key mapping for backwards compatibility with existing dossiers and tests
PILLAR_INTELLIGENCE: Dict[str, Dict[str, Any]] = {
    "network": {
        **TARGET_SOLUTIONS_CATALOG["Network Solutions"],
        "solution": "SD-WAN & Modern Network Infrastructure",
    },
    "security": {
        **TARGET_SOLUTIONS_CATALOG["Cybersecurity Suite"],
        "solution": "Zero-Trust Security & Privileged Access Management",
    },
    "cloud": {
        **TARGET_SOLUTIONS_CATALOG["Enterprise Server & Compute"],
        "solution": "Cloud Modernization & Nutanix HCI",
    },
    "data": {
        **TARGET_SOLUTIONS_CATALOG["Data Analytics Platform"],
        "solution": "Google Cloud BigQuery & Data Intelligence",
    },
}


def _get_first_name(full_name: str) -> str:
    parts = full_name.strip().split()
    return parts[0] if parts else full_name


def _build_outreach_copies(
    company_name: str,
    contact_name: str,
    job_title: str,
    pillar_key: str,
    seniority: str,
    intel: Dict[str, Any],
) -> OutreachCopy:
    first_name = _get_first_name(contact_name)
    solution_name = intel["solution"]
    pillar_name = intel["pillar"]

    # WhatsApp tone
    if seniority in ["c_level", "vp_director"]:
        wa_text = (
            f"Selamat pagi/siang Pak/Bu {first_name}, salam kenal. Saya Dan dari Solution Advisory PT Smartnet Magna Global.\n\n"
            f"Kami mengamati fokus penguatan infrastruktur digital di {company_name}. "
            f"Magna baru saja mendampingi rekanan enterprise terkemuka dalam modernisasi {solution_name}, "
            f"dengan pencapaian efisiensi OPEX hingga 35% dan peningkatan keandalan sistem.\n\n"
            f"Jika berkenan, kami ingin berbagi ringkasan benchmark arsitektur ini melalui diskusi santai 15 menit minggu ini. "
            f"Terima kasih banyak atas waktunya, Pak/Bu."
        )
    else:
        wa_text = (
            f"Halo Pak/Bu {first_name}, salam kenal. Saya Dan dari tim Solution Architect PT Smartnet Magna Global.\n\n"
            f"Melihat peran Bapak/Ibu di {company_name} dalam mengawal operasional {pillar_name}, "
            f"kami ingin sharing arsitektur implementasi {solution_name} yang kami terapkan untuk mengatasi isu latency dan availability.\n\n"
            f"Boleh kami minta waktu 10-15 menit via virtual call atau coffee sync santai minggu ini? Terima kasih Pak/Bu."
        )

    # Email
    email_subject = f"[Benchmark & Solusi] Penguatan {intel['solution'].split('&')[0].strip()} di {company_name}"
    email_body = (
        f"Yth. Bapak/Ibu {contact_name},\n"
        f"{job_title} - {company_name}\n\n"
        f"Salam hangat dari PT Smartnet Magna Global (Magna).\n\n"
        f"Sebagai mitra integrasi sistem teknologi enterprise di Indonesia, kami mencermati komitmen {company_name} "
        f"dalam memperkuat ketahanan operasional dan kepatuhan sistem informasi.\n\n"
        f"Melalui pilar {pillar_name}, tim spesialis kami telah membantu berbagai institusi mengimplementasikan arsitektur {solution_name} "
        f"dengan keunggulan utama:\n"
        f"1. {intel['benefits'][0]}\n"
        f"2. {intel['benefits'][1]}\n"
        f"3. {intel['benefits'][2]}\n\n"
        f"Kami ingin mengundang Bapak/Ibu untuk sesi executive briefing singkat (20 menit) guna mendiskusikan arsitektur teknis "
        f"dan studi kasus relevan tanpa komitmen awal.\n\n"
        f"Apakah hari Kamis atau Jumat ini ada waktu luang yang pas untuk diskusi virtual singkat?\n\n"
        f"Hormat kami,\n"
        f"Dan | Solution Advisory\n"
        f"PT Smartnet Magna Global\n"
        f"www.magnaglobal.id"
    )

    # LinkedIn
    linkedin_note = (
        f"Halo Pak/Bu {first_name}, salam kenal dari tim Magna Global. "
        f"Senang terhubung dengan profesional di {company_name}. "
        f"Kami banyak berkolaborasi di modernisasi {pillar_name} & kepatuhan SLA. "
        f"Senang jika bisa bertukar wawasan terkait benchmark arsitektur terkini. Salam!"
    )

    return OutreachCopy(
        whatsapp=wa_text,
        email_subject=email_subject,
        email_body=email_body,
        linkedin=linkedin_note,
    )


class ProspectingService:
    def generate_dossier(self, req: ProspectingGenerateRequest) -> ProspectingGenerateResponse:
        """Synthesize outbound strategy dossier from target company and contact input."""
        function_key = req.job_function.lower() if req.job_function else "network"
        if function_key not in PILLAR_INTELLIGENCE:
            function_key = "network"

        intel = PILLAR_INTELLIGENCE[function_key]

        hypothesis = SolutionHypothesis(
            pain_points=intel["pain_points"],
            recommended_solution=intel["solution"],
            solution_pillar=intel["pillar"],
            tech_stack=intel["tech_stack"],
            key_benefits=intel["benefits"],
        )

        outreach = _build_outreach_copies(
            company_name=req.company_name,
            contact_name=req.contact.full_name,
            job_title=req.contact.job_title,
            pillar_key=function_key,
            seniority=req.seniority,
            intel=intel,
        )

        return ProspectingGenerateResponse(
            company_name=req.company_name,
            contact=req.contact,
            hypothesis=hypothesis,
            outreach=outreach,
            discovery_questions=intel["discovery_questions"],
        )

    def convert_prospect(
        self,
        db: Session,
        req: ProspectingConvertRequest,
        current_user: User,
    ) -> ProspectingConvertResponse:
        """
        Convert prospecting lead into real database records:
        - Creates or finds Company (by normalized name).
        - Creates or finds CompanyContact (links to Company, source='lusha_outbound').
        - Creates Opportunity with prefilled pain points, solution, and contact.
        - Records TimelineEvent.
        """
        raw_company_name = req.company_name.strip()
        norm_name = compute_normalized_name(raw_company_name)

        # 1. Company Resolution
        company = (
            db.query(Company)
            .filter(
                (Company.normalized_name == norm_name)
                | (sa_func.lower(Company.name) == raw_company_name.lower())
            )
            .first()
        )

        if not company:
            company = Company(
                name=raw_company_name,
                normalized_name=norm_name,
                website=req.website,
                industry=req.industry or "General Enterprise",
                employee_count="500+",
            )
            db.add(company)
            db.flush()
            logger.info(f"[Prospecting] Created new company: {company.name} ({company.id})")
        else:
            if req.website and not company.website:
                company.website = req.website
            if req.industry and not company.industry:
                company.industry = req.industry

        # 2. Contact Resolution
        target_name = req.contact.full_name.strip()
        contact_query = db.query(CompanyContact).filter(CompanyContact.company_id == company.id)

        existing_contact = None
        if req.contact.email:
            existing_contact = contact_query.filter(
                sa_func.lower(CompanyContact.email) == req.contact.email.strip().lower()
            ).first()

        if not existing_contact:
            existing_contact = contact_query.filter(
                sa_func.lower(CompanyContact.name) == target_name.lower()
            ).first()

        if existing_contact:
            contact_obj = existing_contact
            if req.contact.phone and not contact_obj.phone:
                contact_obj.phone = req.contact.phone
            if req.contact.linkedin_url and not contact_obj.linkedin_url:
                contact_obj.linkedin_url = req.contact.linkedin_url
            if req.contact.job_title and not contact_obj.job_title:
                contact_obj.job_title = req.contact.job_title
        else:
            contact_obj = CompanyContact(
                company_id=company.id,
                name=target_name,
                job_title=req.contact.job_title or "Stakeholder",
                department=req.contact.department or "Information Technology",
                email=req.contact.email,
                phone=req.contact.phone,
                linkedin_url=req.contact.linkedin_url,
                is_primary=True,
                notes="Diimpor dari Lusha Outbound Prospecting Hub",
            )
            db.add(contact_obj)
            db.flush()
            logger.info(f"[Prospecting] Created new company contact: {contact_obj.name} ({contact_obj.id})")

        # 3. Opportunity Creation
        solution_title = "Inisiatif Outbound Solusi"
        pain_points_text = ""
        pillar_text = "General Enterprise IT"

        if req.hypothesis:
            solution_title = req.hypothesis.recommended_solution
            pillar_text = req.hypothesis.solution_pillar
            pain_points_text = "\n".join(f"- {p}" for p in req.hypothesis.pain_points)

        opp_title = (
            req.opportunity.title
            if req.opportunity and req.opportunity.title
            else f"{solution_title} - {company.name}"
        )

        customer_needs = (
            f"Peluang Outbound Hasil Analisis Prospek Lusha:\n\n"
            f"Solusi Sasaran: {solution_title} ({pillar_text})\n"
            f"Stakeholder Kunci: {contact_obj.name} ({contact_obj.job_title})\n\n"
            f"Hipotesis Kebutuhan & Pain Points:\n{pain_points_text}"
        )

        potential_revenue = (
            req.opportunity.estimated_value
            if req.opportunity and req.opportunity.estimated_value
            else 0.0
        )

        opportunity = Opportunity(
            company_id=company.id,
            primary_contact_id=contact_obj.id,
            company_name=company.name,
            contact_name=contact_obj.name,
            website=company.website,
            email=contact_obj.email,
            phone=contact_obj.phone,
            industry=company.industry,
            product=solution_title,
            customer_needs=customer_needs,
            additional_notes=(
                req.opportunity.notes
                if req.opportunity and req.opportunity.notes
                else f"Pilar: {pillar_text}. Sumber prospek: Lusha API."
            ),
            potential_revenue=potential_revenue,
            status="New",
            created_by=current_user.id,
        )
        db.add(opportunity)
        db.flush()

        # 4. Record Timeline Event
        timeline = TimelineEvent(
            opportunity_id=opportunity.id,
            actor_id=current_user.id,
            actor_name=current_user.full_name or "Consultant",
            action="Prospecting Converted",
            description=(
                f"Peluang outbound berhasil dibuat untuk {company.name}. "
                f"Target kontak: {contact_obj.name} ({contact_obj.job_title}) via Lusha Prospecting Hub."
            ),
            event_type="create",
        )
        db.add(timeline)

        db.commit()
        db.refresh(opportunity)

        return ProspectingConvertResponse(
            status="success",
            message=f"Peluang '{opportunity.company_name}' berhasil dibuat dan terhubung ke database.",
            company_id=str(company.id),
            contact_id=str(contact_obj.id),
            opportunity_id=str(opportunity.id),
            redirect_url=f"/opportunities/{opportunity.id}",
        )

    @staticmethod
    def detect_pillar_from_titles(titles: List[str]) -> str:
        """
        Determines the most relevant Magna solution pillar (security, data, cloud, network)
        from a list of stakeholder job titles.
        """
        if not titles:
            return "security"

        scores = {"security": 0, "data": 0, "cloud": 0, "network": 0}

        sec_pattern = re.compile(
            r"\b(security|cyber|ciso|infosec|soc|siem|iam|pam|epm|privilege|pentest|penetration|vulnerability|firewall|keamanan)\b",
            re.IGNORECASE,
        )
        data_pattern = re.compile(
            r"\b(data|bigquery|vertex|analytics|bi|machine learning|ai|artificial intelligence|ml|database|dba|sql|warehouse|lakehouse|etl)\b",
            re.IGNORECASE,
        )
        cloud_pattern = re.compile(
            r"\b(cloud|nutanix|hci|vmware|aws|gcp|azure|devops|sre|site reliability|kubernetes|k8s|docker|infrastructure|infrastruktur|datacenter|sysadmin)\b",
            re.IGNORECASE,
        )
        net_pattern = re.compile(
            r"\b(network|cisco|catalyst|aruba|switching|routing|sd-wan|sdwan|lan|wan|noc|wireless|telecom|telekomunikasi|jaringan)\b",
            re.IGNORECASE,
        )

        for title in titles:
            if not title:
                continue
            lower_title = title.lower()
            if sec_pattern.search(lower_title):
                scores["security"] += 2
            if data_pattern.search(lower_title):
                if not re.search(r"\b(financial|finance|keuangan|business|bisnis|sales|penjualan)\s+analyst\b", lower_title):
                    scores["data"] += 2
            if cloud_pattern.search(lower_title):
                scores["cloud"] += 2
            if net_pattern.search(lower_title):
                scores["network"] += 2

        best_pillar = max(scores, key=lambda k: scores[k])
        if scores[best_pillar] == 0:
            return "security"
        return best_pillar

    @staticmethod
    def generate_stakeholder_opportunity_dossier(
        company_name: str,
        pillar_key: str,
        solution_title: str,
        contacts: List[CompanyContact],
        primary_contact: Optional[CompanyContact] = None,
        custom_pain_points: Optional[List[str]] = None,
        custom_notes: Optional[str] = None,
    ) -> str:
        """
        Synthesizes a structured consultative customer_needs dossier formatted in clean markdown
        tailored for Magna's enterprise solutions.
        """
        intel = TARGET_SOLUTIONS_CATALOG.get(solution_title) or PILLAR_INTELLIGENCE.get(pillar_key, PILLAR_INTELLIGENCE["security"])
        pillar_name = intel["pillar"]

        stakeholder_lines = []
        for c in contacts:
            is_pic = " [Primary PIC]" if primary_contact and c.id == primary_contact.id else ""
            email_str = f" | {c.email}" if c.email else ""
            phone_str = f" | {c.phone}" if c.phone else ""
            title_str = c.job_title or "Stakeholder"
            stakeholder_lines.append(f"- {c.name} ({title_str}){email_str}{phone_str}{is_pic}")

        pain_points = custom_pain_points if custom_pain_points else intel.get("pain_points", [])
        pain_points_lines = [f"- {p}" for p in pain_points]

        benefits = intel.get("benefits", [])
        benefits_lines = [f"- {b}" for b in benefits]

        discovery_questions = intel.get("discovery_questions", [])
        discovery_lines = [f"- {q}" for q in discovery_questions]

        tech_stack = ", ".join(intel.get("tech_stack", []))

        notes_section = ""
        if custom_notes:
            notes_section = f"\n## 6. Catatan Strategis & Next Step\n- {custom_notes}\n"

        dossier = (
            f"# PELUANG OUTBOUND SOLUSI MAGNA (Stakeholder Directory MOIP)\n\n"
            f"## 1. Solusi Sasaran & Pilar\n"
            f"- Pilar Portofolio: {pillar_name}\n"
            f"- Target Solusi: {solution_title}\n"
            f"- Kategori: Enterprise Outbound Opportunity\n"
            f"- Referensi Tech Stack: {tech_stack}\n\n"
            f"## 2. Pemangku Kepentingan Utama (Key Stakeholders)\n"
            f"{chr(10).join(stakeholder_lines)}\n\n"
            f"## 3. Analisis Kebutuhan & Hipotesis Masalah\n"
            f"{chr(10).join(pain_points_lines)}\n\n"
            f"## 4. Value Proposition & Manfaat Bisnis Solusi Magna\n"
            f"{chr(10).join(benefits_lines)}\n\n"
            f"## 5. Pertanyaan Kunci Discovery Awal (Sales Probing)\n"
            f"{chr(10).join(discovery_lines)}\n"
            f"{notes_section}"
        )
        return dossier

    def create_opportunity_from_stakeholders(
        self,
        db: Session,
        req: ConvertStakeholdersToOpportunityRequest,
        current_user: User,
    ) -> ConvertToOpportunityResponse:
        """
        Creates an active Opportunity from one or more Stakeholder Directory contacts,
        associating primary PIC, key contacts list, tailored customer needs dossier,
        and recording audit timeline events.
        """
        # 1. Resolve Company
        company: Optional[Company] = None
        if req.company_id:
            try:
                comp_uuid = uuid.UUID(req.company_id)
                company = db.query(Company).filter(Company.id == comp_uuid).first()
            except (ValueError, TypeError):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Format company_id tidak valid: {req.company_id}",
                )
            if not company:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Perusahaan dengan ID {req.company_id} tidak ditemukan.",
                )
        elif req.company_name and req.company_name.strip():
            raw_name = req.company_name.strip()
            norm_name = compute_normalized_name(raw_name)
            company = (
                db.query(Company)
                .filter(
                    (sa_func.lower(Company.name) == raw_name.lower())
                    | (Company.normalized_name == norm_name)
                )
                .first()
            )
            if not company:
                company = Company(
                    name=raw_name,
                    normalized_name=norm_name,
                    industry=req.industry,
                    website=req.website,
                )
                db.add(company)
                db.flush()
                logger.info(f"[Prospecting] Created new company from stakeholders: {company.name} ({company.id})")
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="company_id atau company_name wajib disediakan.",
            )

        # 2. Resolve Contacts
        resolved_contacts: List[CompanyContact] = []
        seen_contact_ids = set()

        if req.contact_ids:
            for cid in req.contact_ids:
                try:
                    c_uuid = uuid.UUID(cid)
                except (ValueError, TypeError):
                    continue
                contact = (
                    db.query(CompanyContact)
                    .filter(CompanyContact.id == c_uuid, CompanyContact.company_id == company.id)
                    .first()
                )
                if contact and contact.id not in seen_contact_ids:
                    seen_contact_ids.add(contact.id)
                    resolved_contacts.append(contact)

        if req.candidate_contacts:
            for cand in req.candidate_contacts:
                existing = None
                if cand.id:
                    try:
                        cand_uuid = uuid.UUID(cand.id)
                        existing = (
                            db.query(CompanyContact)
                            .filter(CompanyContact.id == cand_uuid, CompanyContact.company_id == company.id)
                            .first()
                        )
                    except (ValueError, TypeError):
                        pass
                if not existing and cand.email:
                    existing = (
                        db.query(CompanyContact)
                        .filter(
                            CompanyContact.company_id == company.id,
                            sa_func.lower(CompanyContact.email) == cand.email.strip().lower(),
                        )
                        .first()
                    )
                if not existing and cand.name:
                    existing = (
                        db.query(CompanyContact)
                        .filter(
                            CompanyContact.company_id == company.id,
                            sa_func.lower(CompanyContact.name) == cand.name.strip().lower(),
                        )
                        .first()
                    )

                if existing:
                    if existing.id not in seen_contact_ids:
                        seen_contact_ids.add(existing.id)
                        resolved_contacts.append(existing)
                else:
                    new_contact = CompanyContact(
                        company_id=company.id,
                        name=cand.name.strip(),
                        job_title=cand.job_title,
                        department=cand.department,
                        email=cand.email,
                        phone=cand.phone,
                        linkedin_url=cand.linkedin_url,
                        is_primary=bool(cand.is_primary),
                        notes="Ditambahkan via Outbound Opportunity Generation",
                    )
                    db.add(new_contact)
                    db.flush()
                    seen_contact_ids.add(new_contact.id)
                    resolved_contacts.append(new_contact)

        if not resolved_contacts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Setidaknya satu kontak stakeholder yang valid harus dipilih untuk membuat opportunity.",
            )

        # 3. Resolve Primary Contact
        primary_contact: Optional[CompanyContact] = None
        if req.primary_contact_id:
            for c in resolved_contacts:
                if str(c.id) == req.primary_contact_id:
                    primary_contact = c
                    break

        if not primary_contact:
            for c in resolved_contacts:
                if c.is_primary:
                    primary_contact = c
                    break

        if not primary_contact:
            primary_contact = resolved_contacts[0]

        # 4. Pillar & Solution Matching
        titles = [c.job_title or "" for c in resolved_contacts]
        pillar_key = req.pillar.lower() if req.pillar and req.pillar.lower() in PILLAR_INTELLIGENCE else self.detect_pillar_from_titles(titles)
        intel = PILLAR_INTELLIGENCE.get(pillar_key, PILLAR_INTELLIGENCE["security"])
        solution_title = req.solution_title.strip() if req.solution_title and req.solution_title.strip() else intel["solution"]
        opp_title = (
            req.custom_title.strip()
            if req.custom_title and req.custom_title.strip()
            else f"[{solution_title}] - {company.name}"
        )

        # 5. Build Customer Needs Dossier
        customer_needs = self.generate_stakeholder_opportunity_dossier(
            company_name=company.name,
            pillar_key=pillar_key,
            solution_title=solution_title,
            contacts=resolved_contacts,
            primary_contact=primary_contact,
            custom_pain_points=req.pain_points,
            custom_notes=req.notes,
        )

        # 6. Build Contacts JSON
        contacts_json = [
            {
                "id": str(c.id),
                "name": c.name,
                "job_title": c.job_title,
                "department": c.department,
                "email": c.email,
                "phone": c.phone,
                "linkedin_url": c.linkedin_url,
                "is_primary": (c.id == primary_contact.id),
            }
            for c in resolved_contacts
        ]

        # 7. Create Opportunity
        opportunity = Opportunity(
            company_id=company.id,
            primary_contact_id=primary_contact.id,
            company_name=company.name,
            contact_name=primary_contact.name,
            email=primary_contact.email,
            phone=primary_contact.phone,
            website=company.website,
            industry=company.industry,
            product=solution_title,
            customer_needs=customer_needs,
            additional_notes=(
                req.notes
                if req.notes
                else f"Pilar: {intel['pillar']}. Terhubung dengan {len(resolved_contacts)} kontak stakeholder direktori."
            ),
            potential_revenue=req.estimated_value or 0.0,
            status="New",
            created_by=current_user.id,
            contacts=contacts_json,
        )
        db.add(opportunity)
        db.flush()

        # 8. Record Timeline Event
        timeline = TimelineEvent(
            opportunity_id=opportunity.id,
            actor_id=current_user.id,
            actor_name=current_user.full_name or "Consultant",
            action="Outbound Opportunity Created",
            description=(
                f"Peluang outbound berhasil dibuat untuk {company.name} dengan target solusi {solution_title}. "
                f"Terhubung dengan {len(resolved_contacts)} stakeholder (Primary PIC: {primary_contact.name})."
            ),
            event_type="create",
        )
        db.add(timeline)

        db.commit()
        db.refresh(opportunity)

        return ConvertToOpportunityResponse(
            status="success",
            message=f"Peluang '{opportunity.company_name}' berhasil dibuat dan terhubung ke {len(resolved_contacts)} stakeholder.",
            opportunity_id=str(opportunity.id),
            company_id=str(company.id),
            primary_contact_id=str(primary_contact.id),
            contacts_count=len(resolved_contacts),
            redirect_url=f"/opportunities/{opportunity.id}",
            pillar=intel["pillar"],
            solution_title=solution_title,
            opportunity_title=opp_title,
        )


prospecting_service = ProspectingService()
