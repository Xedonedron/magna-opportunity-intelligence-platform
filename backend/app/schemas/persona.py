import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator


class FocusAreaItem(BaseModel):
    title: str
    description: str


class QuestionItem(BaseModel):
    category: str
    question: str
    purpose: str


class ObjectionItem(BaseModel):
    objection: str
    response: str


class PersonaPlaybookOutput(BaseModel):
    """Pydantic schema for LLM structured output generation."""
    focus_areas: List[FocusAreaItem] = Field(default_factory=list, description="Key priority focus areas")
    questions: List[QuestionItem] = Field(default_factory=list, description="Targeted discovery questions")
    value_props: List[str] = Field(default_factory=list, description="Tailored value propositions")
    objection_handling: List[ObjectionItem] = Field(default_factory=list, description="Common objections and responses")


class PersonaGenerateRequest(BaseModel):
    seniority: str = Field(..., min_length=1, max_length=50, description="Seniority level or custom role (1-50 characters)")
    department: str = Field(..., min_length=1, max_length=50, description="Department name or custom domain (1-50 characters)")
    force_regenerate: bool = False

    @field_validator("seniority", "department")
    @classmethod
    def validate_non_empty_stripped(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Value cannot be empty or only whitespace")
        if len(trimmed) > 50:
            raise ValueError("Value length cannot exceed 50 characters")
        return trimmed


class OpportunityPersonaResponse(BaseModel):
    id: uuid.UUID
    opportunity_id: uuid.UUID
    seniority: str
    department: str
    focus_areas: List[FocusAreaItem] = []
    questions: List[QuestionItem] = []
    value_props: List[str] = []
    objection_handling: List[ObjectionItem] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OpportunityPersonaListResponse(BaseModel):
    items: List[OpportunityPersonaResponse]
    total: int
