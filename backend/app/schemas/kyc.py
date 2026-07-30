from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional, Any


class UseCaseItem(BaseModel):
    title: str
    description: str
    problem_solved: str
    how_it_works: str
    business_impact: str
    google_products: list[str] = []
    smartnet_solutions: list[str] = []
    impact_level: str = "Medium"  # High, Medium, Low


class KYCReportResponse(BaseModel):
    id: UUID
    opportunity_id: UUID
    version: int
    status: str
    executive_summary: Optional[str] = None
    company_overview: Optional[dict[str, Any]] = None
    industry_analysis: Optional[str] = None
    business_model: Optional[str] = None
    company_location: Optional[str] = None
    customer_need_summary: Optional[str] = None
    potential_pain_points: Optional[list[str]] = None
    use_cases: Optional[list[dict[str, Any]]] = None
    meeting_objectives: Optional[list[str]] = None
    recommended_questions: Optional[list[str]] = None
    preparation_checklist: Optional[list[str]] = None
    references: Optional[list[dict[str, Any]]] = None
    source_type: str
    progress_step: Optional[str] = None
    progress_percent: int = 0
    error_message: Optional[str] = None
    created_by: Optional[UUID] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class KYCReportListResponse(BaseModel):
    items: list[KYCReportResponse]
    total: int


class KYCRegenerateRequest(BaseModel):
    source_type: str = "manual_regenerate"
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
    executive_summary: Optional[str] = None
    company_overview: Optional[dict[str, Any]] = None
    industry_analysis: Optional[str] = None
    business_model: Optional[str] = None
    company_location: Optional[str] = None
    customer_need_summary: Optional[str] = None
    potential_pain_points: Optional[list[str]] = None
    use_cases: Optional[list[dict[str, Any]]] = None
    meeting_objectives: Optional[list[str]] = None
    recommended_questions: Optional[list[str]] = None
    preparation_checklist: Optional[list[str]] = None
    references: Optional[list[dict[str, Any]]] = None
