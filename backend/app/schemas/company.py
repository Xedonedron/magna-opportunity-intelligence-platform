from __future__ import annotations

import uuid
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Any
from app.schemas.opportunity import OpportunityResponse


class CompanyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    website: Optional[str] = Field(None, max_length=500)
    industry: Optional[str] = Field(None, max_length=255)
    business_process: Optional[str] = None
    employee_count: Optional[str] = Field(None, max_length=100)
    tech_stack: Optional[list[str] | dict[str, Any]] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None

    @field_validator("website")
    @classmethod
    def validate_website(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        val = v.strip()
        if not val:
            return None
        if not (val.startswith("http://") or val.startswith("https://")):
            return f"https://{val}"
        return val

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        val = v.strip()
        if not val:
            raise ValueError("Company name cannot be empty")
        return val


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    website: Optional[str] = Field(None, max_length=500)
    industry: Optional[str] = Field(None, max_length=255)
    business_process: Optional[str] = None
    employee_count: Optional[str] = Field(None, max_length=100)
    tech_stack: Optional[list[str] | dict[str, Any]] = None

    @field_validator("website")
    @classmethod
    def validate_website(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        val = v.strip()
        if not val:
            return None
        if not (val.startswith("http://") or val.startswith("https://")):
            return f"https://{val}"
        return val

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        val = v.strip()
        if not val:
            raise ValueError("Company name cannot be blank")
        return val


class CompanyResponse(BaseModel):
    id: uuid.UUID
    name: str
    normalized_name: str
    website: Optional[str] = None
    industry: Optional[str] = None
    business_process: Optional[str] = None
    employee_count: Optional[str] = None
    tech_stack: Optional[list[str] | dict[str, Any]] = None
    opportunities_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CompanyDetailResponse(CompanyResponse):
    opportunities: list[OpportunityResponse] = []


class CompanyListResponse(BaseModel):
    items: list[CompanyResponse]
    total: int
    page: int
    page_size: int


class CompanyOpportunityCreate(BaseModel):
    """Payload for creating a child opportunity under a company.
    If company_name, website, or industry are not specified, they are
    automatically inherited from the parent Company.
    """
    deal_title: Optional[str] = Field(None, max_length=255, description="Specific initiative or deal title (e.g. 'Backup' or 'Data Warehouse')")
    product: Optional[str] = Field(None, max_length=255)
    customer_needs: str = Field(..., min_length=1)
    contact_name: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = None
    phone: Optional[str] = Field(None, max_length=50)
    additional_notes: Optional[str] = None
    potential_revenue: Optional[float] = None
    estimated_agenda_date: Optional[datetime] = None
    meeting_schedule: Optional[datetime] = None
    assigned_engineer: Optional[str] = None
    status: str = Field("New", max_length=50)


class CompanySimilarityMatch(BaseModel):
    company: CompanyResponse
    similarity_score: float = Field(1.0, ge=0.0, le=1.0)
    match_type: str = Field("domain_match", description="domain_match | exact_normalized")


class CompanySimilarityCheckResponse(BaseModel):
    query: str
    normalized_query: str
    exact_match: Optional[CompanyResponse] = None
    has_similar: bool = False
    matches: list[CompanySimilarityMatch] = []

class CompanyKYCSummaryResponse(BaseModel):
    company_id: uuid.UUID
    company_name: str
    has_kyc: bool
    source_opportunity_id: Optional[uuid.UUID] = None
    source_opportunity_title: Optional[str] = None
    kyc_version: Optional[int] = None
    completed_at: Optional[datetime] = None
    executive_summary: Optional[str] = None
    company_overview: Optional[dict[str, Any]] = None
    industry_analysis: Optional[str] = None
    business_model: Optional[str] = None
    company_location: Optional[str] = None
    competitor_analysis: Optional[list[Any]] = None
    potential_pain_points: Optional[list[Any]] = None

