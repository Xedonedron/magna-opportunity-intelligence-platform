from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class MeetingBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    date: datetime
    location: str | None = None
    participants: list[str] | None = None
    agenda: list[str] | None = None
    notes: str | None = None
    action_items: list[str] | None = None
    attachments: list[dict] | None = None


class MeetingCreate(MeetingBase):
    opportunity_id: UUID


class MeetingUpdate(BaseModel):
    title: str | None = None
    date: datetime | None = None
    location: str | None = None
    participants: list[str] | None = None
    agenda: list[str] | None = None
    notes: str | None = None
    action_items: list[str] | None = None
    attachments: list[dict] | None = None


class MeetingResponse(MeetingBase):
    id: UUID
    opportunity_id: UUID
    created_by: UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MeetingListResponse(BaseModel):
    items: list[MeetingResponse]
    total: int