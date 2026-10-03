"""Schemas for Prospecting & Lusha Outbound Generation."""

from __future__ import annotations

import uuid
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field, field_validator


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

    @field_validator("reveal", mode="before")
    @classmethod
    def normalize_reveal(cls, v):
        if not v:
            return ["emails", "phones"]
        if isinstance(v, str):
            v = [v]
        normalized = []
        for item in v:
            item_lower = str(item).lower().strip()
            if item_lower in ("email", "emails"):
                if "emails" not in normalized:
                    normalized.append("emails")
            elif item_lower in ("phone", "phones", "phone_numbers"):
                if "phones" not in normalized:
                    normalized.append("phones")
            elif item_lower:
                normalized.append(item_lower)
        return normalized or ["emails", "phones"]

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
    email: Optional[str] = None
    phone: Optional[str] = None
    primary_email: Optional[str] = None
    primary_phone: Optional[str] = None
    linkedin_url: Optional[str] = None


class LushaEnrichResponse(BaseModel):
    success: bool = True
    contact_id: Optional[str] = None
    emails: List[str] = []
    phones: List[str] = []
    email: Optional[str] = None
    phone: Optional[str] = None
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


# ---------------------------------------------------------------------------
# Outbound Opportunity from Stakeholder Directory Schemas
# ---------------------------------------------------------------------------

class StakeholderOpportunityContactInput(BaseModel):
    id: Optional[str] = None
    name: str
    job_title: Optional[str] = None
    department: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    is_primary: Optional[bool] = False


class ConvertStakeholdersToOpportunityRequest(BaseModel):
    company_id: Optional[str] = Field(None, description="UUID of existing Company in database")
    company_name: Optional[str] = Field(None, description="Company name if company_id is not provided")
    industry: Optional[str] = Field(None, description="Company industry sector")
    website: Optional[str] = Field(None, description="Company website URL")
    contact_ids: List[str] = Field(default_factory=list, description="List of CompanyContact UUIDs saved in directory")
    candidate_contacts: Optional[List[StakeholderOpportunityContactInput]] = Field(
        default=None, 
        description="Direct contacts from prospect search if not yet in DB"
    )
    primary_contact_id: Optional[str] = Field(None, description="UUID of primary stakeholder contact")
    pillar: Optional[str] = Field(None, description="Target Magna solution pillar: security, data, cloud, network, or auto-detect")
    solution_title: Optional[str] = Field(None, description="Custom solution title or recommended solution name")
    custom_title: Optional[str] = Field(None, description="Custom deal/opportunity title")
    pain_points: Optional[List[str]] = Field(default=None, description="Specific pain points or custom hypotheses")
    estimated_value: Optional[float] = Field(default=0.0, description="Estimated deal value in IDR")
    notes: Optional[str] = Field(default=None, description="Additional notes for the opportunity")


class ConvertToOpportunityResponse(BaseModel):
    status: str = "success"
    message: str
    opportunity_id: str
    company_id: str
    primary_contact_id: Optional[str] = None
    contacts_count: int = 0
    redirect_url: str
    pillar: str
    solution_title: str
    opportunity_title: str
