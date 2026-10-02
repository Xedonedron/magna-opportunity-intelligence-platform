"""Prospecting Service.

Handles synthesis of consultative sales hypotheses, Magna solutions catalog matching,
outreach copy generation (WA, Email, LinkedIn), and conversion of prospects into
active Opportunities, Companies, and CompanyContacts in the MOIP database.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any, Dict, List, Optional
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
)

logger = logging.getLogger(__name__)

# Catalog and domain intelligence mapping for Magna Solutions
PILLAR_INTELLIGENCE: Dict[str, Dict[str, Any]] = {
    "network": {
        "pillar": "Network & Enterprise Workplace",
        "solution": "Automated SD-WAN & Enterprise Campus Network Infrastructure",
        "tech_stack": ["Cisco Catalyst / SD-WAN", "Aruba CX", "Fortinet Secure SD-WAN", "HPE Networking"],
        "pain_points": [
            "Kompleksitas routing multi-cabang & latensi tinggi pada aplikasi perbankan/ERP sentral.",
            "Tingginya OPEX leased line konvensional dengan manajemen alokasi bandwidth yang belum tersentralisasi.",
            "Visibilitas SLA jaringan antar cabang minim saat terjadi insiden packet loss atau failover lambat.",
        ],
        "benefits": [
            "Reduksi biaya sirkuit leased-line hingga 35-40% dengan intelligent dynamic path steering.",
            "Penerapan zero-touch provisioning untuk ekspansi titik cabang baru dalam hitungan jam.",
            "Single-pane-of-glass dashboard monitoring real-time untuk SLA dan utilisasi aplikasi kritis.",
        ],
        "discovery_questions": [
            "Berapa rata-rata Mean Time to Resolution (MTTR) tim network ketika terjadi gangguan link di kantor cabang?",
            "Bagaimana rencana modernisasi WAN saat ini dalam mengimbangi adopsi aplikasi cloud & hybrid?",
            "Apakah alokasi bandwidth saat ini sudah bisa memprioritaskan traffic transaksi kritikal secara otomatis?",
            "Apa tantangan utama terkait manajemen SLA dengan provider telco saat ini?",
        ],
    },
    "security": {
        "pillar": "Cybersecurity Suite",
        "solution": "Zero-Trust Architecture & AI-Driven Managed SOC Defense",
        "tech_stack": ["Palo Alto Networks NGFW", "CrowdStrike Falcon EDR", "Fortinet Security Fabric", "Splunk SIEM"],
        "pain_points": [
            "Kebutuhan kepatuhan ketat regulasi perlindungan data (UU PDP & regulasi OJK) pada infrastruktur perbankan.",
            "Kelelahan audit & alert fatigue pada tim security akibat ribuan log insiden tanpa korelasi AI.",
            "Blindspot keamanan pada hak akses privilese pihak ketiga (vendor & partner eksternal).",
        ],
        "benefits": [
            "Pencegahan ancaman ransomware real-time dengan Mean Time to Detect (MTTD) di bawah 15 menit.",
            "Otomatisasi laporan kepatuhan regulasi OJK/BI/PDP guna mempermudah audit internal berkala.",
            "Konsolidasi postur keamanan multi-cabang dan data center dalam arsitektur Zero Trust terpadu.",
        ],
        "discovery_questions": [
            "Bagaimana strategi tim saat ini dalam memastikan kepatuhan regulasi PDP dan mitigasi risiko kebocoran data?",
            "Berapa lama waktu yang dibutuhkan tim SOC saat ini dari deteksi hingga isolasi insiden malware/ransomware?",
            "Apakah saat ini sudah ada mekanisme segmentasi mikro untuk mengisolasi traffic transaksi sensitif?",
            "Bagaimana visibilitas tim terhadap anomali aktivitas pengguna dengan hak akses privileged saat ini?",
        ],
    },
    "cloud": {
        "pillar": "Cloud Infrastructure & Modernization",
        "solution": "Enterprise Hybrid Cloud & Automated Disaster Recovery Infrastructure",
        "tech_stack": ["Nutanix Cloud Platform (HCI)", "VMware Cloud Foundation", "Dell PowerEdge Servers", "AWS / Google Cloud Hybrid"],
        "pain_points": [
            "Biaya CAPEX lisensi & hardware legacy yang membengkak serta kompleksitas scaling data center.",
            "Tantangan pencapaian RTO/RPO ketat pada skenario Disaster Recovery Center (DRC) saat terjadi kegagalan sistem.",
            "Silo operasional antara infrastruktur on-premise eksisting dengan adopsi platform container/microservices.",
        ],
        "benefits": [
            "Efisiensi CAPEX data center hingga 30-40% dengan migrasi ke Hyperconverged Infrastructure (HCI).",
            "Otomatisasi pengujian dan failover DRC dengan Recovery Time Objective (RTO) di bawah 15 menit.",
            "Infrastruktur terukur yang siap mengakomodasi beban kerja high-concurrency transaksi.",
        ],
        "discovery_questions": [
            "Kapan jadwal siklus hardware refresh server data center Anda berikutnya, dan apa fokus efisiensinya?",
            "Bagaimana kesiapan prosedur DRC saat ini dalam memenuhi batas toleransi downtime regulasi?",
            "Apakah tim menghadapi kendala kapasitas storage atau komputasi saat terjadi lonjakan transaksi musiman?",
            "Bagaimana arsitektur platform saat ini mendukung fleksibilitas deployment beban kerja hybrid?",
        ],
    },
    "data": {
        "pillar": "Data Analytics & AI",
        "solution": "Enterprise AI Knowledge Hub & Scalable Modern Data Platform",
        "tech_stack": ["Google BigQuery / Snowflake", "OpenAI / Claude Enterprise", "PostgreSQL pgvector", "dbt DataOps"],
        "pain_points": [
            "Silo data antar divisi perbankan/operasional yang menghambat terciptanya Single Source of Truth.",
            "Proses pelaporan analitik manual yang memakan waktu berhari-hari dan berisiko salah tafsir.",
            "Kurangnya pemanfaatan AI generatif privat untuk mempercepat pencarian SOP & pengetahuan internal secara aman.",
        ],
        "benefits": [
            "Akses analitik mandiri (self-service BI) yang mempercepat pengambilan keputusan manajerial hingga 5x lebih cepat.",
            "AI Assistant internal yang berjalan di private tenant dengan jaminan perlindungan data intelektual perusahaan.",
            "Pipeline data terotomasi dengan SLA sinkronisasi mendekati real-time.",
        ],
        "discovery_questions": [
            "Seberapa cepat para stakeholder bisnis saat ini bisa mendapatkan dashboard laporan performa operasional?",
            "Bagaimana tata kelola data eksisting dalam menjamin akurasi dan konsistensi antar cabang/divisi?",
            "Apakah ada inisiatif pemanfaatan AI untuk membantu tim mempercepat akses dokumen SOP atau verifikasi data?",
            "Apa hambatan utama saat mengintegrasikan sumber data legacy dengan platform analitik modern?",
        ],
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


prospecting_service = ProspectingService()
