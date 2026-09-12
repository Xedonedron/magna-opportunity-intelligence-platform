from pydantic import BaseModel, Field, field_validator, model_validator
from datetime import datetime
from uuid import UUID
from typing import Optional, Any


class CompanyOverviewModel(BaseModel):
    name: str = Field(default="", description="Nama resmi perusahaan")
    description: str = Field(default="", description="Deskripsi singkat profil bisnis dan positioning")
    founded: Optional[str] = Field(default="N/A", description="Tahun pendirian jika diketahui")
    size: Optional[str] = Field(default="N/A", description="Estimasi jumlah karyawan / skala perusahaan")
    headquarters: Optional[str] = Field(default="N/A", description="Lokasi kantor pusat")
    key_products: list[str] = Field(default_factory=list, description="Lini produk / layanan utama")


class CompetitorItem(BaseModel):
    name: str = Field(default="", description="Nama perusahaan kompetitor")
    market_position: str = Field(default="", description="Market Leader / Challenger / Niche / Direct Competitor")
    strengths: list[str] = Field(default_factory=list, description="Keunggulan kompetitif kompetitor")
    weaknesses: list[str] = Field(default_factory=list, description="Kelemahan atau celah pasar kompetitor")
    differentiators: str = Field(default="", description="Diferensiasi target klien terhadap kompetitor ini")


class UseCaseItem(BaseModel):
    title: str = Field(default="", description="Judul use case enterprise grade")
    description: str = Field(default="", description="Deskripsi singkat implementasi use case")
    problem_solved: str = Field(default="", description="Masalah spesifik yang diselesaikan")
    how_it_works: str = Field(default="", description="Arsitektur teknis dan cara kerja solusi")
    business_impact: str = Field(default="", description="Dampak bisnis terukur / ROI / efisiensi")
    google_products: list[str] = Field(default_factory=list, description="Vendor products & technologies utama")
    vendor_products: Optional[list[str]] = Field(default=None, description="Alias untuk vendor products")
    smartnet_solutions: list[str] = Field(default_factory=list, description="Solusi resmi Smartnet Magna Global")
    impact_level: str = Field(default="High", description="High, Medium, atau Low")
    case_study_url: Optional[str] = Field(default=None, description="Verified URL to official SMG case study article")
    case_study_title: Optional[str] = Field(default=None, description="Title of the matched SMG case study article")

    @model_validator(mode="before")
    @classmethod
    def sync_vendor_products(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("google_products") and data.get("vendor_products"):
                data["google_products"] = data["vendor_products"]
            elif data.get("google_products") and not data.get("vendor_products"):
                data["vendor_products"] = data["google_products"]
        return data


# --- Sectional KYC Structured Output Schemas (Inisiatif 1) ---
class CompanyProfileOutput(BaseModel):
    """Module 1: Company Profile & Business Footprint"""
    company_overview: CompanyOverviewModel = Field(description="Profil ringkas perusahaan")
    business_model: str = Field(description="Model bisnis dan revenue stream")
    company_location: str = Field(description="Lokasi fasilitas operasional dan cakupan geografis")


class IndustryCompetitorsOutput(BaseModel):
    """Module 2: Industry Dynamics & Competitors"""
    industry_analysis: str = Field(description="Analisis mendalam lanskap industri dan tren teknologi")
    competitor_analysis: list[CompetitorItem] = Field(default_factory=list, description="Daftar kompetitor utama")


class PainPointsNeedsOutput(BaseModel):
    """Module 3: Customer Pain Points & Latent Needs"""
    customer_need_summary: str = Field(description="Rangkuman latar belakang kebutuhan bisnis & teknis")
    potential_pain_points: list[str] = Field(default_factory=list, description="Daftar pain points teknis / operasional")


class UseCasesOutput(BaseModel):
    """Module 4: Technical Architecture & Presales Use Cases"""
    use_cases: list[UseCaseItem] = Field(default_factory=list, description="Daftar use case arsitektural terurut")


class CategorizedQuestions(BaseModel):
    """Discovery questions split by persona: business vs technical."""
    business: list[str] = Field(
        default_factory=list,
        description="Pertanyaan strategis bisnis, ROI, KPI, dan timeline untuk C-Level/Business Owner"
    )
    technical: list[str] = Field(
        default_factory=list,
        description="Pertanyaan teknis arsitektur, kapasitas, integrasi, dan security untuk IT/DevOps/SecOps"
    )


class EngagementStrategyOutput(BaseModel):
    """Module 5: Presales Engagement Strategy"""
    meeting_objectives: list[str] = Field(default_factory=list, description="Objektif strategis meeting presales")
    recommended_questions: CategorizedQuestions = Field(
        default_factory=CategorizedQuestions,
        description="Discovery questions terbagi atas persona business dan technical"
    )
    preparation_checklist: list[str] = Field(default_factory=list, description="Checklist persiapan teknis dan sales")


class ExecutiveSummaryOutput(BaseModel):
    """Module 6: Ultimate Executive Summary (Sintesis Akhir)"""
    executive_summary: str = Field(description="Sintesis eksekutif C-Level komprehensif 2-3 paragraf")



class KYCReportResponse(BaseModel):
    id: UUID
    opportunity_id: UUID
    version: int
    title: Optional[str] = None
    focus_notes: Optional[str] = None
    status: str
    executive_summary: Optional[str] = None
    company_overview: Optional[dict[str, Any]] = None
    industry_analysis: Optional[str] = None
    competitor_analysis: Optional[list[dict[str, Any]]] = None
    business_model: Optional[str] = None
    company_location: Optional[str] = None
    customer_need_summary: Optional[str] = None
    potential_pain_points: Optional[list[str]] = None
    use_cases: Optional[list[dict[str, Any]]] = None
    meeting_objectives: Optional[list[str]] = None
    recommended_questions: Optional[dict[str, Any]] = None
    preparation_checklist: Optional[list[str]] = None
    references: Optional[list[dict[str, Any]]] = None
    source_type: str
    progress_step: Optional[str] = None
    progress_percent: int = 0
    error_message: Optional[str] = None
    created_by: Optional[UUID] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    @field_validator("recommended_questions", mode="before")
    @classmethod
    def normalize_recommended_questions(cls, v: Any) -> Any:
        """Backward compat: convert legacy list[str] to {business: [], technical: list}."""
        if v is None:
            return None
        if isinstance(v, list):
            return {"business": [], "technical": v}
        if isinstance(v, dict):
            return {
                "business": v.get("business") or [],
                "technical": v.get("technical") or [],
            }
        return v

    class Config:
        from_attributes = True


class KYCReportListResponse(BaseModel):
    items: list[KYCReportResponse]
    total: int


class KYCRegenerateRequest(BaseModel):
    source_type: str = "manual_regenerate"
    title: Optional[str] = None
    focus_notes: Optional[str] = None
    # source_type: manual_regenerate, engineer_edited


class KYCStatusResponse(BaseModel):
    opportunity_id: UUID
    latest_report_id: Optional[UUID] = None
    latest_version: int = 0
    status: str  # pending, running, completed, failed, none
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class KYCReportUpdate(BaseModel):
    """Schema for updating KYC report fields (engineer edits)."""
    title: Optional[str] = None
    focus_notes: Optional[str] = None
    executive_summary: Optional[str] = None
    company_overview: Optional[dict[str, Any]] = None
    industry_analysis: Optional[str] = None
    competitor_analysis: Optional[list[dict[str, Any]]] = None
    business_model: Optional[str] = None
    company_location: Optional[str] = None
    customer_need_summary: Optional[str] = None
    potential_pain_points: Optional[list[str]] = None
    use_cases: Optional[list[dict[str, Any]]] = None
    meeting_objectives: Optional[list[str]] = None
    recommended_questions: Optional[dict[str, Any]] = None
    preparation_checklist: Optional[list[str]] = None
    references: Optional[list[dict[str, Any]]] = None

    @field_validator("recommended_questions", mode="before")
    @classmethod
    def normalize_recommended_questions(cls, v: Any) -> Any:
        """Backward compat: convert legacy list[str] to {business: [], technical: list}."""
        if v is None:
            return None
        if isinstance(v, list):
            return {"business": [], "technical": v}
        if isinstance(v, dict):
            return {
                "business": v.get("business") or [],
                "technical": v.get("technical") or [],
            }
        return v
