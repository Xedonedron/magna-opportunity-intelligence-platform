from __future__ import annotations

import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func

from app.core.database import get_db
from app.models.user import User
from app.models.opportunity import Opportunity, TimelineEvent
from app.schemas.opportunity import (
    OpportunityCreate,
    OpportunityUpdate,
    OpportunityResponse,
    OpportunityDetailResponse,
    OpportunityListResponse,
)
from app.api.auth import get_current_user
from app.tasks import (
    send_opportunity_created_notification,
    send_status_changed_notification,
    run_kyc_pipeline_task,
)
from app.models.notification import Notification

router = APIRouter(prefix="/api/opportunities", tags=["opportunities"])

VALID_STATUSES = [
    "New", "KYC Running", "Ready Meeting", "Meeting Scheduled",
    "Meeting Done", "Need Proposal", "Negotiation", "PO",
    "Won", "Lost", "On Hold",
]


def _log_timeline(
    db: Session,
    opportunity_id: uuid.UUID,
    actor: User,
    action: str,
    description: str | None = None,
    event_type: str = "system",
) -> None:
    event = TimelineEvent(
        opportunity_id=opportunity_id,
        actor_id=actor.id,
        actor_name=actor.full_name,
        action=action,
        description=description,
        event_type=event_type,
    )
    db.add(event)


@router.get("", response_model=OpportunityListResponse)
async def list_opportunities(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    engineer_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all opportunities with pagination and filters."""
    query = db.query(Opportunity)

    if search:
        query = query.filter(
            Opportunity.company_name.ilike(f"%{search}%")
        )
    if status_filter:
        query = query.filter(Opportunity.status == status_filter)
    if engineer_id:
        query = query.filter(Opportunity.assigned_engineer_id == engineer_id)

    total = query.count()
    items = (
        query.order_by(Opportunity.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return OpportunityListResponse(
        items=[OpportunityResponse.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=OpportunityResponse, status_code=status.HTTP_201_CREATED)
async def create_opportunity(
    data: OpportunityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new opportunity. Auto-logs timeline event."""
    opportunity = Opportunity(
        company_name=data.company_name,
        website=data.website,
        email=data.email,
        phone=data.phone,
        industry=data.industry,
        product=data.product,
        customer_needs=data.customer_needs,
        additional_notes=data.additional_notes,
        meeting_schedule=data.meeting_schedule,
        assigned_engineer_id=data.assigned_engineer_id,
        created_by=current_user.id,
        status="New",
    )
    db.add(opportunity)
    db.flush()

    _log_timeline(
        db,
        opportunity.id,
        current_user,
        "Opportunity Created",
        f"Opportunity for {data.company_name} was created.",
        event_type="create",
    )

    # Create notification directly (also triggers async task as backup)
    notification = Notification(
        user_id=current_user.id,
        opportunity_id=opportunity.id,
        type="opportunity_created",
        title="Opportunity Created",
        message=f"Opportunity for {data.company_name} has been created.",
    )
    db.add(notification)
    db.commit()
    db.refresh(opportunity)

    # Trigger async notification (backup)
    try:
        send_opportunity_created_notification.delay(str(opportunity.id))
    except Exception:
        pass  # Don't fail the request if notification fails

    # Trigger AI KYC pipeline automatically
    try:
        run_kyc_pipeline_task.delay(str(opportunity.id), source_type="automatic")
    except Exception:
        pass  # Don't fail the request if KYC trigger fails

    return opportunity


@router.get("/{opportunity_id}", response_model=OpportunityDetailResponse)
async def get_opportunity(
    opportunity_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get opportunity detail including timeline events."""
    opportunity = db.query(Opportunity).filter(Opportunity.id == opportunity_id).first()
    if opportunity is None:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return opportunity


@router.patch("/{opportunity_id}", response_model=OpportunityResponse)
async def update_opportunity(
    opportunity_id: uuid.UUID,
    data: OpportunityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update opportunity fields. Auto-logs timeline for status changes and updates."""
    opportunity = db.query(Opportunity).filter(Opportunity.id == opportunity_id).first()
    if opportunity is None:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    update_data = data.model_dump(exclude_unset=True)
    old_status = opportunity.status

    # Validate status
    if "status" in update_data and update_data["status"] not in VALID_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}",
        )

    for field, value in update_data.items():
        setattr(opportunity, field, value)

    # Log status change separately
    if "status" in update_data and update_data["status"] != old_status:
        _log_timeline(
            db,
            opportunity.id,
            current_user,
            "Status Changed",
            f"Status changed from '{old_status}' to '{update_data['status']}'.",
            event_type="status_change",
        )
    elif update_data:
        changed_fields = list(update_data.keys())
        _log_timeline(
            db,
            opportunity.id,
            current_user,
            "Opportunity Updated",
            f"Updated fields: {', '.join(changed_fields)}.",
            event_type="update",
        )

    db.commit()
    db.refresh(opportunity)

    # Trigger async notification for status change
    if "status" in update_data and update_data["status"] != old_status:
        try:
            send_status_changed_notification.delay(
                str(opportunity.id), old_status, update_data["status"]
            )
        except Exception:
            pass

    return opportunity


@router.delete("/{opportunity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_opportunity(
    opportunity_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an opportunity and all related timeline events."""
    opportunity = db.query(Opportunity).filter(Opportunity.id == opportunity_id).first()
    if opportunity is None:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    db.delete(opportunity)
    db.commit()