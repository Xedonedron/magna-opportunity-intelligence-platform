"""Schemas for Prospecting & Lusha Outbound Generation."""

from __future__ import annotations

import uuid
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Lusha Schemas
# ---------------------------------------------------------------------------

class LushaUsageResponse(BaseModel):
    plan: str = "starter"
    credits_remaining: int
    credits_total: int
    credits_used: int
    renewal_date: Optional[str] = None
    rate_limit_per_minute: int = 40
    rate_limit_per_day: int = 100
    rate_limit_reset_seconds: Optional[int] = None
    rate_limit_reset_formatted: Optional[str] = None
    error: Optional[str] = None


class LushaSearchRequest(BaseModel):
    company_name: str = Field(..., min_length=1, description="Target company name")
    company_domain: Optional[str] = Field(default=None, description="Target company website domain")
    country: str = Field(default="Indonesia", description="Company location country")
    job_function: Optional[str] = Field(None, description="Job function/pillar: network, security, cloud, data")
    seniority: Optional[str] = Field(None, description="Seniority level: c_level, vp_director, head_lead, manager, specialist")
    job_titles: Optional[List[str]] = Field(default=None, description="Optional custom job title filters")
    page: int = Field(default=0, ge=0)
    size: int = Field(default=10, ge=1, le=50)
    limit: Optional[int] = Field(default=None, description="Alias for size")

    @property
    def effective_limit(self) -> int:
        return self.limit if self.limit is not None else self.size


class LushaCandidateContact(BaseModel):
    id: str
    name: Optional[str] = None
    first_name: str
    last_name: str
    full_name: str
    job_title: str
    company_name: Optional[str] = None
    company_domain: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    linkedin_url: Optional[str] = None
    has_email: bool = False
    has_phone: bool = False
    department: Optional[str] = None
    seniority: Optional[str] = None
    is_unlocked: bool = False
    unlocked_email: Optional[str] = None
    unlocked_phone: Optional[str] = None
    is_saved_in_directory: bool = False
    local_contact_id: Optional[str] = None


class LushaSearchResponse(BaseModel):
    success: bool = True
    total: int = 0
    contacts: List[LushaCandidateContact] = []
    available_job_titles: List[str] = []
    available_departments: List[str] = []
    page: int = 0
    size: int = 10
    message: Optional[str] = None
    rate_limit_reset_seconds: Optional[int] = None
    rate_limit_reset_formatted: Optional[str] = None


class CompanyCandidate(BaseModel):
    company_id: Optional[str] = None
    name: str
    domain: Optional[str] = None
    industry: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    employee_count: Optional[str] = None
    in_database: bool = False
    stakeholder_count: int = 0
    logo_url: Optional[str] = None


class CompanySearchResponse(BaseModel):
    success: bool = True
    query: str
    results: List[CompanyCandidate] = []
    companies: Optional[List[CompanyCandidate]] = None
    message: Optional[str] = None


class ExportContactItem(BaseModel):
    name: str
    job_title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class ExportExcelRequest(BaseModel):
    company_name: str
    contacts: List[ExportContactItem]


class SaveStakeholdersRequest(BaseModel):
    company_name: str
    company_domain: Optional[str] = None
    industry: Optional[str] = None
    country: Optional[str] = "Indonesia"
    contacts: List[ExportContactItem]


class LushaEnrichRequest(BaseModel):
    contact_id: Optional[str] = Field(None, description="Single contact ID to enrich")
    contact_ids: Optional[List[str]] = Field(None, description="List of contact IDs (batch)")
    reveal: List[str] = Field(default=["emails", "phones"], description="Data fields to reveal")

    def get_effective_ids(self) -> List[str]:
        if self.contact_ids:
            return self.contact_ids
        if self.contact_id:
            return [self.contact_id]
        return []


class EnrichedEmail(BaseModel):
    email: str
    type: str = "work"


class EnrichedPhone(BaseModel):
    number: str
    type: str = "mobile"


class EnrichedContactResult(BaseModel):
    id: str
    full_name: str
    job_title: str
    emails: List[Any] = []
    phones: List[Any] = []
    primary_email: Optional[str] = None
    primary_phone: Optional[str] = None
    linkedin_url: Optional[str] = None


class LushaEnrichResponse(BaseModel):
    success: bool = True
    contact_id: Optional[str] = None
    emails: List[str] = []
    phones: List[str] = []
    contact: Optional[Union[EnrichedContactResult, Dict[str, Any]]] = None
    contacts: List[Union[EnrichedContactResult, Dict[str, Any]]] = []
    credits_charged: int = 0
    results: List[EnrichedContactResult] = []
    message: Optional[str] = None


# ---------------------------------------------------------------------------
# Prospecting Generation Schemas
# ---------------------------------------------------------------------------

class TargetContactInput(BaseModel):
    full_name: str
    job_title: str
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    seniority_level: Optional[str] = None
    department: Optional[str] = None


class ProspectingGenerateRequest(BaseModel):
    company_name: str = Field(..., min_length=2)
    industry: Optional[str] = "Perbankan & Lembaga Keuangan (FSI)"
    website: Optional[str] = None
    job_function: str = Field(..., description="network, security, cloud, or data")
    seniority: str = Field(..., description="c_level, vp_director, head_lead, manager, specialist")
    contact: TargetContactInput
    notes: Optional[str] = None


class SolutionHypothesis(BaseModel):
    pain_points: List[str]
    recommended_solution: str
    solution_pillar: str
    tech_stack: List[str] = []
    key_benefits: List[str]


class OutreachCopy(BaseModel):
    whatsapp: str
    email_subject: str
    email_body: str
    linkedin: str


class ProspectingGenerateResponse(BaseModel):
    company_name: str
    contact: TargetContactInput
    hypothesis: SolutionHypothesis
    outreach: OutreachCopy
    discovery_questions: List[str]


# ---------------------------------------------------------------------------
# Convert to Opportunity Schemas
# ---------------------------------------------------------------------------

class ProspectingOpportunityInput(BaseModel):
    title: Optional[str] = None
    pillar: Optional[str] = None
    notes: Optional[str] = None
    estimated_value: Optional[float] = 0.0


class ProspectingConvertRequest(BaseModel):
    company_name: str
    industry: Optional[str] = None
    website: Optional[str] = None
    contact: TargetContactInput
    opportunity: Optional[ProspectingOpportunityInput] = None
    hypothesis: Optional[SolutionHypothesis] = None


class ProspectingConvertResponse(BaseModel):
    status: str = "success"
    message: str
    company_id: str
    contact_id: str
    opportunity_id: str
    redirect_url: str
