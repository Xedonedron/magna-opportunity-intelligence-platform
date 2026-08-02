from __future__ import annotations

import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func

from app.core.database import get_db
from app.models.user import User
from app.models.opportunity import Opportunity, TimelineEvent
from app.models.meeting import Meeting
from app.schemas.opportunity import (
    OpportunityCreate,
    OpportunityUpdate,
    OpportunityResponse,
    OpportunityDetailResponse,
    OpportunityListResponse,
)
from app.api.auth import get_current_user, require_capability
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
    current_user: User = Depends(require_capability("create_edit")),
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
        potential_revenue=data.potential_revenue,
        estimated_agenda_date=data.estimated_agenda_date,
        meeting_schedule=data.meeting_schedule,
        assigned_engineer_id=data.assigned_engineer_id,
        created_by=current_user.id,
        status="New",
    )
    db.add(opportunity)
    db.flush()

    # Automatically create initial Meeting record if meeting_schedule is provided
    if data.meeting_schedule:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        m_dt = data.meeting_schedule if data.meeting_schedule.tzinfo else data.meeting_schedule.replace(tzinfo=timezone.utc)
        opportunity.status = "Meeting Scheduled" if m_dt > now else "Meeting Done"

        initial_meeting = Meeting(
            opportunity_id=opportunity.id,
            title=f"Initial Discovery Call - {data.company_name}",
            date=data.meeting_schedule,
            location="Online / Google Meet",
            notes=f"Initial meeting scheduled for {data.company_name} ({data.product or 'Pre-sales'}).",
            created_by=current_user.id,
        )
        db.add(initial_meeting)

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
    current_user: User = Depends(require_capability("create_edit")),
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

    # Sync meeting_schedule with Meeting table
    if "meeting_schedule" in update_data and update_data["meeting_schedule"]:
        new_date = update_data["meeting_schedule"]
        existing_meeting = (
            db.query(Meeting)
            .filter(Meeting.opportunity_id == opportunity.id)
            .order_by(Meeting.created_at.asc())
            .first()
        )
        if existing_meeting:
            existing_meeting.date = new_date
        else:
            new_meeting = Meeting(
                opportunity_id=opportunity.id,
                title=f"Initial Discovery Call - {opportunity.company_name}",
                date=new_date,
                location="Online / Google Meet",
                notes=f"Initial meeting scheduled for {opportunity.company_name}.",
                created_by=current_user.id,
            )
            db.add(new_meeting)

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
    current_user: User = Depends(require_capability("delete")),
):
    """Delete an opportunity and all related timeline events."""
    opportunity = db.query(Opportunity).filter(Opportunity.id == opportunity_id).first()
    if opportunity is None:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    db.delete(opportunity)
    db.commit()


# --- AI Chat / Brainstorming Endpoint ---
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from langchain_openai import ChatOpenAI
from app.core.config import settings
from app.models.kyc_report import KYCReport
from app.models.opportunity import OpportunityChatMessage
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

class ChatInputPayload(BaseModel):
    message: str
    model: Optional[str] = None
    temperature: Optional[float] = None

def _purge_old_messages(db: Session, opportunity_id: uuid.UUID):
    """Purge chat messages older than 7 days."""
    try:
        expiry_time = datetime.now(timezone.utc) - timedelta(days=7)
        db.query(OpportunityChatMessage).filter(
            OpportunityChatMessage.opportunity_id == opportunity_id,
            OpportunityChatMessage.created_at < expiry_time
        ).delete(synchronize_session=False)
        db.commit()
    except Exception as e:
        db.rollback()

@router.get("/{opportunity_id}/chat")
async def get_chat_history(
    opportunity_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get chat history for an opportunity (with 7-day auto-purge)."""
    opp = db.query(Opportunity).filter(Opportunity.id == opportunity_id).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    # Purge old messages
    _purge_old_messages(db, opportunity_id)

    # Get history
    messages = (
        db.query(OpportunityChatMessage)
        .filter(OpportunityChatMessage.opportunity_id == opportunity_id)
        .order_by(OpportunityChatMessage.created_at.asc())
        .all()
    )

    return {
        "messages": [
            {
                "id": str(msg.id),
                "role": msg.role,
                "content": msg.content,
                "created_at": msg.created_at.isoformat()
            }
            for msg in messages
        ]
    }

@router.post("/{opportunity_id}/chat")
async def chat_with_opportunity(
    opportunity_id: uuid.UUID,
    payload: ChatInputPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Brainstorm and chat with AI contextualized by the opportunity and its latest KYC report, saving to DB."""
    opp = db.query(Opportunity).filter(Opportunity.id == opportunity_id).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    # 1. Purge old messages
    _purge_old_messages(db, opportunity_id)

    # 2. Save user message to DB
    user_msg = OpportunityChatMessage(
        opportunity_id=opportunity_id,
        role="user",
        content=payload.message
    )
    db.add(user_msg)
    db.commit()

    # 3. Retrieve all non-expired messages (history)
    db_messages = (
        db.query(OpportunityChatMessage)
        .filter(OpportunityChatMessage.opportunity_id == opportunity_id)
        .order_by(OpportunityChatMessage.created_at.asc())
        .all()
    )

    # 4. Fetch latest completed KYC report
    kyc = (
        db.query(KYCReport)
        .filter(KYCReport.opportunity_id == opportunity_id, KYCReport.status == "completed")
        .order_by(KYCReport.version.desc())
        .first()
    )

    # 5. Build opportunity and KYC context
    context_lines = [
        f"Opportunity Name: {opp.company_name}",
        f"Industry: {opp.industry or 'N/A'}",
        f"Target Product: {opp.product or 'N/A'}",
        f"Customer Needs: {opp.customer_needs}",
        f"Additional Notes: {opp.additional_notes or 'N/A'}"
    ]

    if kyc:
        context_lines.extend([
            "\nLatest KYC Report Insights:",
            f"- Executive Summary: {kyc.executive_summary}",
            f"- Customer Need Summary: {kyc.customer_need_summary}",
            f"- Potential Pain Points: {', '.join(kyc.potential_pain_points or [])}",
            f"- Recommended Use Cases: {', '.join([uc.get('title', '') for uc in kyc.use_cases or []])}"
        ])

    context_str = "\n".join(context_lines)

    # 6. Build system instruction
    system_prompt = f"""You are a professional Pre-sales Engineer and Solutions Architect at PT Smartnet Magna Global (SMG).
Your job is to help the pre-sales team brainstorm, prepare for client meetings, design matching cloud/data/cybersecurity architectures, and answer questions.

Use the following Opportunity & KYC Context to inform your answers. Always align your recommendations with PT Smartnet Magna Global's solutions catalog:
1. Google Cloud Infrastructure & Modernization (GCP, GKE, Serverless, Cloud Migration)
2. Data Analytics & AI (BigQuery, Looker, Vertex AI, Predictive/Generative AI)
3. Cybersecurity Suite (Zero Trust, Cloud Security, SIEM, SOC, Penetration Testing)
4. Network Solutions (SD-WAN, Enterprise Networking, SASE)
5. Managed Services & Support

Be specific, professional, and actionable. Keep your tone helpful and advisory.

Opportunity & KYC Context:
{context_str}
"""

    # 7. Build messages list for the model
    api_messages = [SystemMessage(content=system_prompt)]
    for msg in db_messages:
        if msg.role == "user":
            api_messages.append(HumanMessage(content=msg.content))
        elif msg.role == "assistant":
            api_messages.append(AIMessage(content=msg.content))

    from fastapi.responses import StreamingResponse
    from app.core.database import SessionLocal
    from app.core.llm import get_chat_llm

    async def generate_response_chunks():
        try:
            llm = get_chat_llm(
                model_name=payload.model,
                temperature=payload.temperature,
                streaming=True,
                db=db,
            )
            
            full_content = ""
            async for chunk in llm.astream(api_messages):
                content_chunk = chunk.content
                if isinstance(content_chunk, list):
                    content_chunk = "".join([c.get("text", "") if isinstance(c, dict) else str(c) for c in content_chunk])
                if content_chunk:
                    full_content += content_chunk
                    yield content_chunk

            # Save assistant message to DB after stream finishes
            if full_content.strip():
                db_session = SessionLocal()
                try:
                    assistant_msg = OpportunityChatMessage(
                        opportunity_id=opportunity_id,
                        role="assistant",
                        content=full_content
                    )
                    db_session.add(assistant_msg)
                    db_session.commit()
                except Exception as e:
                    db_session.rollback()
                finally:
                    db_session.close()
        except Exception as e:
            yield f"\n[AI Error]: {str(e)}"

    return StreamingResponse(generate_response_chunks(), media_type="text/plain")


@router.get("/search/global")
async def global_search(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Global search for opportunities and meetings."""
    from sqlalchemy import or_
    from app.models.meeting import Meeting
    
    user_role = current_user.role
    
    # 1. Search Opportunities
    opp_query = db.query(Opportunity)
    if user_role == "lgo":
        opp_query = opp_query.filter(Opportunity.created_by == current_user.id)
    elif user_role == "engineer":
        opp_query = opp_query.filter(
            or_(
                Opportunity.assigned_engineer_id == current_user.id,
                Opportunity.created_by == current_user.id,
            )
        )
        
    opp_results = opp_query.filter(
        or_(
            Opportunity.company_name.ilike(f"%{q}%"),
            Opportunity.industry.ilike(f"%{q}%"),
            Opportunity.product.ilike(f"%{q}%"),
            Opportunity.customer_needs.ilike(f"%{q}%"),
        )
    ).limit(5).all()
    
    # 2. Search Meetings
    meet_query = db.query(Meeting).join(Meeting.opportunity)
    if user_role == "lgo":
        meet_query = meet_query.filter(Opportunity.created_by == current_user.id)
    elif user_role == "engineer":
        meet_query = meet_query.filter(
            or_(
                Opportunity.assigned_engineer_id == current_user.id,
                Opportunity.created_by == current_user.id,
            )
        )
        
    meet_results = meet_query.filter(
        or_(
            Meeting.title.ilike(f"%{q}%"),
            Meeting.notes.ilike(f"%{q}%"),
        )
    ).limit(5).all()
    
    return {
        "opportunities": [
            {
                "id": str(opp.id),
                "company_name": opp.company_name,
                "product": opp.product,
                "status": opp.status,
            }
            for opp in opp_results
        ],
        "meetings": [
            {
                "id": str(meet.id),
                "title": meet.title,
                "company_name": meet.opportunity.company_name,
                "opportunity_id": str(meet.opportunity_id),
                "date": meet.date.isoformat() if meet.date else None,
            }
            for meet in meet_results
        ]
    }