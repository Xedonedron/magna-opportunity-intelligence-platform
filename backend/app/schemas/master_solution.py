from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class MasterSolutionBase(BaseModel):
    title: str = Field(..., max_length=255)
    slug: Optional[str] = Field(None, max_length=255)
    pillar: str = Field(..., max_length=100)
    tier: int = Field(default=1, ge=1, le=3)
    primary_products: List[str] = Field(default_factory=list)
    all_products: Optional[List[str]] = Field(default_factory=list)
    target_industries: List[str] = Field(default_factory=lambda: ["Enterprise General"])
    key_subheadings: Optional[List[str]] = Field(default_factory=list)
    pain_points: Optional[List[str]] = Field(default_factory=list)
    business_impact: Optional[str] = None
    summary_snippet: Optional[str] = None
    source_url: Optional[str] = Field(None, max_length=500)
    is_active: bool = True


class MasterSolutionCreate(MasterSolutionBase):
    pass


class MasterSolutionUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    slug: Optional[str] = Field(None, max_length=255)
    pillar: Optional[str] = Field(None, max_length=100)
    tier: Optional[int] = Field(None, ge=1, le=3)
    primary_products: Optional[List[str]] = None
    all_products: Optional[List[str]] = None
    target_industries: Optional[List[str]] = None
    key_subheadings: Optional[List[str]] = None
    pain_points: Optional[List[str]] = None
    business_impact: Optional[str] = None
    summary_snippet: Optional[str] = None
    source_url: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None


class MasterSolutionResponse(MasterSolutionBase):
    id: uuid.UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MasterSolutionListResponse(BaseModel):
    items: List[MasterSolutionResponse]
    total: int
    pillars: List[str]
