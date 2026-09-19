from __future__ import annotations

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.models.user import User
from app.models.company import Company
from app.models.company_contact import CompanyContact
from app.schemas.company_contact import (
    CompanyContactCreate,
    CompanyContactUpdate,
    CompanyContactResponse,
    CompanyContactListResponse,
)
from app.core.security import get_current_user, require_capability

router = APIRouter(tags=["company_contacts"])


@router.get(
    "/{company_id}/contacts",
    response_model=CompanyContactListResponse,
)
async def list_company_contacts(
    company_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all contacts for a specific company folder."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    contacts = (
        db.query(CompanyContact)
        .filter(CompanyContact.company_id == company_id)
        .order_by(desc(CompanyContact.is_primary), CompanyContact.name.asc())
        .all()
    )

    return CompanyContactListResponse(
        items=[CompanyContactResponse.model_validate(c) for c in contacts],
        total=len(contacts),
    )


@router.post(
    "/{company_id}/contacts",
    response_model=CompanyContactResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_company_contact(
    company_id: uuid.UUID,
    data: CompanyContactCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("create_edit")),
):
    """Create a new contact stakeholder under a company."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    # If new contact is primary, demote other existing contacts
    if data.is_primary:
        db.query(CompanyContact).filter(
            CompanyContact.company_id == company_id,
            CompanyContact.is_primary.is_(True),
        ).update({"is_primary": False}, synchronize_session=False)

    contact = CompanyContact(
        company_id=company_id,
        name=data.name,
        job_title=data.job_title,
        department=data.department,
        email=data.email,
        phone=data.phone,
        linkedin_url=data.linkedin_url,
        is_primary=data.is_primary,
        notes=data.notes,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return CompanyContactResponse.model_validate(contact)


@router.get(
    "/{company_id}/contacts/{contact_id}",
    response_model=CompanyContactResponse,
)
async def get_company_contact(
    company_id: uuid.UUID,
    contact_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get single company contact details."""
    contact = (
        db.query(CompanyContact)
        .filter(
            CompanyContact.id == contact_id,
            CompanyContact.company_id == company_id,
        )
        .first()
    )
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found",
        )
    return CompanyContactResponse.model_validate(contact)


@router.patch(
    "/{company_id}/contacts/{contact_id}",
    response_model=CompanyContactResponse,
)
async def update_company_contact(
    company_id: uuid.UUID,
    contact_id: uuid.UUID,
    data: CompanyContactUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("create_edit")),
):
    """Update a company contact."""
    contact = (
        db.query(CompanyContact)
        .filter(
            CompanyContact.id == contact_id,
            CompanyContact.company_id == company_id,
        )
        .first()
    )
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found",
        )

    update_dict = data.model_dump(exclude_unset=True)

    # If is_primary set to True, unset others
    if update_dict.get("is_primary") is True:
        db.query(CompanyContact).filter(
            CompanyContact.company_id == company_id,
            CompanyContact.id != contact_id,
            CompanyContact.is_primary.is_(True),
        ).update({"is_primary": False}, synchronize_session=False)

    for field, val in update_dict.items():
        setattr(contact, field, val)

    db.commit()
    db.refresh(contact)
    return CompanyContactResponse.model_validate(contact)


@router.delete(
    "/{company_id}/contacts/{contact_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_company_contact(
    company_id: uuid.UUID,
    contact_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("delete")),
):
    """Delete a company contact."""
    contact = (
        db.query(CompanyContact)
        .filter(
            CompanyContact.id == contact_id,
            CompanyContact.company_id == company_id,
        )
        .first()
    )
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found",
        )

    db.delete(contact)
    db.commit()
    return None
