import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


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


class PersonaGenerateRequest(BaseModel):
    seniority: str = Field(..., description="Staff | Manager | Head | VP | Director/C-Level")
    department: str = Field(..., description="Finance | HR | Marketing | Sales | IT | Operations")
    force_regenerate: bool = False


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