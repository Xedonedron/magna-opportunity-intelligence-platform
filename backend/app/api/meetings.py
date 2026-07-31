import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.meeting import Meeting
from app.models.opportunity import Opportunity, TimelineEvent
from app.models.user import User
from app.api.auth import get_current_user, require_capability
from app.schemas.meeting import (
    MeetingCreate,
    MeetingUpdate,
    MeetingResponse,
    MeetingListResponse,
)
from app.tasks import create_calendar_event

router = APIRouter(prefix="/api/meetings", tags=["meetings"])


@router.get("", response_model=MeetingListResponse)
def list_meetings(
    opportunity_id: uuid.UUID | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Meeting)
    if opportunity_id:
        query = query.filter(Meeting.opportunity_id == opportunity_id)
    total = query.count()
    items = query.order_by(Meeting.date.desc()).offset(skip).limit(limit).all()
    return MeetingListResponse(items=items, total=total)


@router.get("/{meeting_id}", response_model=MeetingResponse)
def get_meeting(
    meeting_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


@router.post("", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
def create_meeting(
    payload: MeetingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("create_edit")),
):
    # Verify opportunity exists
    opp = db.query(Opportunity).filter(Opportunity.id == payload.opportunity_id).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    meeting = Meeting(
        opportunity_id=payload.opportunity_id,
        title=payload.title,
        date=payload.date,
        location=payload.location,
        participants=payload.participants,
        agenda=payload.agenda,
        notes=payload.notes,
        action_items=payload.action_items,
        attachments=payload.attachments,
    )
    db.add(meeting)

    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    meeting_dt = payload.date if payload.date.tzinfo else payload.date.replace(tzinfo=timezone.utc)
    is_past = meeting_dt < now

    action_label = "Meeting Logged" if is_past else "Meeting Scheduled"

    # Log timeline event
    timeline = TimelineEvent(
        opportunity_id=payload.opportunity_id,
        actor_name="System",
        action=action_label,
        description=f"Meeting '{payload.title}' ({'held' if is_past else 'scheduled for'} {payload.date.strftime('%b %d, %Y %I:%M %p')})",
        event_type="meeting",
    )
    db.add(timeline)

    # Update opportunity status if still early stage
    if opp.status in ("New", "KYC Running", "Ready Meeting"):
        new_status = "Meeting Done" if is_past else "Meeting Scheduled"
        opp.status = new_status
        status_timeline = TimelineEvent(
            opportunity_id=payload.opportunity_id,
            actor_name="System",
            action="Status Changed",
            description=f"Status changed to {new_status}",
            event_type="status_change",
        )
        db.add(status_timeline)

    db.commit()
    db.refresh(meeting)

    # Trigger async calendar event creation
    try:
        create_calendar_event.delay(str(meeting.id))
    except Exception:
        pass  # Don't fail the request if calendar fails

    return meeting


@router.put("/{meeting_id}", response_model=MeetingResponse)
def update_meeting(
    meeting_id: uuid.UUID,
    payload: MeetingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("create_edit")),
):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(meeting, field, value)

    # Log timeline event
    timeline = TimelineEvent(
        opportunity_id=meeting.opportunity_id,
        actor_name="System",
        action="Meeting Updated",
        description=f"Meeting '{meeting.title}' was updated",
        event_type="meeting",
    )
    db.add(timeline)

    db.commit()
    db.refresh(meeting)
    return meeting


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meeting(
    meeting_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("delete")),
):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    opp_id = meeting.opportunity_id
    title = meeting.title

    db.delete(meeting)

    # Log timeline event
    timeline = TimelineEvent(
        opportunity_id=opp_id,
        actor_name="System",
        action="Meeting Deleted",
        description=f"Meeting '{title}' was deleted",
        event_type="meeting",
    )
    db.add(timeline)

    db.commit()