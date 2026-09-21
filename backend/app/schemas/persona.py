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
    focus_areas: List[FocusAreaItem] = Field(
        ...,
        min_length=1,
        description="Key priority focus areas (provide at least 2-4 tactical areas)",
    )
    questions: List[QuestionItem] = Field(
        ...,
        min_length=1,
        description="Targeted discovery questions (provide at least 3-6 consultative questions)",
    )
    value_props: List[str] = Field(
        ...,
        min_length=1,
        description="Tailored value propositions (provide at least 2-4 strong value points)",
    )
    objection_handling: List[ObjectionItem] = Field(
        ...,
        min_length=1,
        description="Common objections and responses (provide at least 2-3 objection responses)",
    )


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
