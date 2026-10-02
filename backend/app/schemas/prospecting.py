"""Schemas for Prospecting & Lusha Outbound Generation."""

from __future__ import annotations

import uuid
from typing import Any, Dict, List, Optional
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


class LushaSearchRequest(BaseModel):
    company_name: str = Field(..., min_length=1, description="Target company name")
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


class LushaSearchResponse(BaseModel):
    success: bool = True
    total: int = 0
    contacts: List[LushaCandidateContact] = []
    page: int = 0
    size: int = 10
    message: Optional[str] = None


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
    emails: List[EnrichedEmail] = []
    phones: List[EnrichedPhone] = []
    primary_email: Optional[str] = None
    primary_phone: Optional[str] = None
    linkedin_url: Optional[str] = None


class LushaEnrichResponse(BaseModel):
    success: bool = True
    contact_id: Optional[str] = None
    emails: List[str] = []
    phones: List[str] = []
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
