from __future__ import annotations

import uuid
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr


# --- Timeline ---
class TimelineEventResponse(BaseModel):
    id: uuid.UUID
    opportunity_id: uuid.UUID
    actor_id: uuid.UUID | None
    actor_name: str
    action: str
    description: str | None
    event_type: str
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Opportunity ---
class OpportunityCreate(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=255)
    contact_name: str | None = Field(None, max_length=255)
    website: str | None = Field(None, max_length=500)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=50)
    industry: str | None = Field(None, max_length=255)
    product: str | None = Field(None, max_length=255)
    customer_needs: str = Field(..., min_length=1)
    additional_notes: str | None = None
    potential_revenue: float | None = None
    estimated_agenda_date: datetime | None = None
    meeting_schedule: datetime | None = None
    assigned_engineer: str | None = None


class OpportunityUpdate(BaseModel):
    company_name: str | None = Field(None, min_length=1, max_length=255)
    contact_name: str | None = Field(None, max_length=255)
    website: str | None = Field(None, max_length=500)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=50)
    industry: str | None = Field(None, max_length=255)
    product: str | None = Field(None, max_length=255)
    customer_needs: str | None = Field(None, min_length=1)
    additional_notes: str | None = None
    potential_revenue: float | None = None
    estimated_agenda_date: datetime | None = None
    status: str | None = Field(None, max_length=50)
    meeting_schedule: datetime | None = None
    assigned_engineer: str | None = None


class UserBrief(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    avatar_url: str | None

    model_config = {"from_attributes": True}


class OpportunityResponse(BaseModel):
    id: uuid.UUID
    company_name: str
    contact_name: str | None = None
    website: str | None
    email: str | None
    phone: str | None
    industry: str | None
    product: str | None
    customer_needs: str
    additional_notes: str | None
    potential_revenue: float | None = None
    estimated_agenda_date: datetime | None = None
    status: str
    meeting_schedule: datetime | None
    assigned_engineer: str | None
    created_by: uuid.UUID
    creator: UserBrief
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OpportunityDetailResponse(OpportunityResponse):
    timeline_events: list[TimelineEventResponse] = []


# --- Opportunity Document ---
class OpportunityDocumentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    url: str = Field(..., min_length=1, max_length=2000)
    description: str | None = Field(None, max_length=2000)
    labels: list[str] | None = None


class OpportunityDocumentUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=500)
    url: str | None = Field(None, min_length=1, max_length=2000)
    description: str | None = Field(None, max_length=2000)
    labels: list[str] | None = None


class OpportunityDocumentResponse(BaseModel):
    id: uuid.UUID
    opportunity_id: uuid.UUID
    title: str
    url: str
    description: str | None
    labels: list[str] | None
    uploaded_by: uuid.UUID
    uploader: UserBrief
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OpportunityDocumentListResponse(BaseModel):
    items: list[OpportunityDocumentResponse]
    total: int


class OpportunityListResponse(BaseModel):
    items: list[OpportunityResponse]
    total: int
    page: int
    page_size: int