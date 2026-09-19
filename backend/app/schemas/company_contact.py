from __future__ import annotations

import uuid
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from typing import Optional


class CompanyContactBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    job_title: Optional[str] = Field(None, max_length=255)
    department: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=100)
    linkedin_url: Optional[str] = Field(None, max_length=500)
    is_primary: bool = Field(False)
    notes: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        val = v.strip()
        if not val:
            raise ValueError("Contact name cannot be empty")
        return val

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        val = v.strip()
        return val if val else None

    @field_validator("linkedin_url")
    @classmethod
    def validate_linkedin(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        val = v.strip()
        if not val:
            return None
        if not (val.startswith("http://") or val.startswith("https://")):
            return f"https://{val}"
        return val


class CompanyContactCreate(CompanyContactBase):
    pass


class CompanyContactUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    job_title: Optional[str] = Field(None, max_length=255)
    department: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=100)
    linkedin_url: Optional[str] = Field(None, max_length=500)
    is_primary: Optional[bool] = None
    notes: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        val = v.strip()
        if not val:
            raise ValueError("Contact name cannot be blank")
        return val

    @field_validator("linkedin_url")
    @classmethod
    def validate_linkedin(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        val = v.strip()
        if not val:
            return None
        if not (val.startswith("http://") or val.startswith("https://")):
            return f"https://{val}"
        return val


class CompanyContactResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    name: str
    job_title: Optional[str] = None
    department: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    is_primary: bool = False
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CompanyContactListResponse(BaseModel):
    items: list[CompanyContactResponse]
    total: int
