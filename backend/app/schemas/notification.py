from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional


class NotificationResponse(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    opportunity_id: Optional[UUID] = None
    type: str
    title: str
    message: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    total: int
    unread_count: int


class NotificationCreate(BaseModel):
    user_id: Optional[UUID] = None
    opportunity_id: Optional[UUID] = None
    type: str
    title: str
    message: Optional[str] = None
    metadata_json: Optional[str] = None


class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None