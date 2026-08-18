"""Opportunity Target Persona API endpoints."""

from __future__ import annotations

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.models.opportunity import Opportunity, TimelineEvent
from app.models.opportunity_persona import OpportunityPersona
from app.models.kyc_report import KYCReport
from app.schemas.persona import (
    PersonaGenerateRequest,
    OpportunityPersonaResponse,
    OpportunityPersonaListResponse,
)
from app.core.security import get_current_user
from app.services.persona_service import generate_persona_playbook

router = APIRouter(prefix="/api/opportunities/{opportunity_id}/personas", tags=["personas"])


def _get_opportunity_or_404(db: Session, opportunity_id: uuid.UUID) -> Opportunity:
    opportunity = db.query(Opportunity).filter(Opportunity.id == opportunity_id).first()
    if opportunity is None:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return opportunity


@router.get("", response_model=OpportunityPersonaListResponse)
async def list_personas(
    opportunity_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all generated personas for an opportunity."""
    _get_opportunity_or_404(db, opportunity_id)
    items = (
        db.query(OpportunityPersona)
        .filter(OpportunityPersona.opportunity_id == opportunity_id)
        .order_by(OpportunityPersona.updated_at.desc())
        .all()
    )
    return OpportunityPersonaListResponse(items=items, total=len(items))


@router.get("/detail", response_model=OpportunityPersonaResponse | None)
async def get_persona_detail(
    opportunity_id: uuid.UUID,
    seniority: str = Query(...),
    department: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get persona playbook by seniority and department."""
    _get_opportunity_or_404(db, opportunity_id)
    persona = (
        db.query(OpportunityPersona)
        .filter(
            OpportunityPersona.opportunity_id == opportunity_id,
            OpportunityPersona.seniority == seniority,
            OpportunityPersona.department == department,
        )
        .first()
    )
    return persona


@router.post("/generate", response_model=OpportunityPersonaResponse)
async def generate_or_get_persona(
    opportunity_id: uuid.UUID,
    payload: PersonaGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate (or retrieve cached) persona playbook for specific seniority & department."""
    opportunity = _get_opportunity_or_404(db, opportunity_id)

    # Check existing persona
    existing_persona = (
        db.query(OpportunityPersona)
        .filter(
            OpportunityPersona.opportunity_id == opportunity_id,
            OpportunityPersona.seniority == payload.seniority,
            OpportunityPersona.department == payload.department,
        )
        .first()
    )

    if existing_persona and not payload.force_regenerate:
        return existing_persona

    # Get KYC summary if available
    latest_kyc = (
        db.query(KYCReport)
        .filter(KYCReport.opportunity_id == opportunity_id)
        .order_by(KYCReport.version.desc())
        .first()
    )
    kyc_summary_text = None
    if latest_kyc:
        parts = []
        if latest_kyc.company_overview:
            if isinstance(latest_kyc.company_overview, dict):
                desc = latest_kyc.company_overview.get("description") or latest_kyc.company_overview.get("summary") or ""
                if desc:
                    parts.append(f"Company Overview: {desc}")
            elif isinstance(latest_kyc.company_overview, str):
                parts.append(f"Company Overview: {latest_kyc.company_overview}")
        if latest_kyc.industry_analysis:
            if isinstance(latest_kyc.industry_analysis, dict):
                ind = latest_kyc.industry_analysis.get("industry") or latest_kyc.industry_analysis.get("summary") or ""
                if ind:
                    parts.append(f"Industry Analysis: {ind}")
            elif isinstance(latest_kyc.industry_analysis, str):
                parts.append(f"Industry Analysis: {latest_kyc.industry_analysis}")
        if latest_kyc.executive_summary:
            parts.append(f"Executive Summary: {latest_kyc.executive_summary}")
        if parts:
            kyc_summary_text = "\n".join(parts)

    playbook_data = await generate_persona_playbook(
        company_name=opportunity.company_name,
        industry=opportunity.industry,
        product=opportunity.product,
        customer_needs=opportunity.customer_needs,
        additional_notes=opportunity.additional_notes,
        seniority=payload.seniority,
        department=payload.department,
        kyc_summary=kyc_summary_text,
    )

    if existing_persona:
        existing_persona.focus_areas = playbook_data.get("focus_areas", [])
        existing_persona.questions = playbook_data.get("questions", [])
        existing_persona.value_props = playbook_data.get("value_props", [])
        existing_persona.objection_handling = playbook_data.get("objection_handling", [])
        persona_record = existing_persona
    else:
        persona_record = OpportunityPersona(
            opportunity_id=opportunity_id,
            seniority=payload.seniority,
            department=payload.department,
            focus_areas=playbook_data.get("focus_areas", []),
            questions=playbook_data.get("questions", []),
            value_props=playbook_data.get("value_props", []),
            objection_handling=playbook_data.get("objection_handling", []),
        )
        db.add(persona_record)

    # Add timeline event
    timeline = TimelineEvent(
        opportunity_id=opportunity_id,
        actor_id=current_user.id,
        actor_name=current_user.full_name or current_user.email,
        action=f"Generate Persona Playbook ({payload.seniority} - {payload.department})",
        description=f"Generated meeting persona intelligence playbook for {payload.seniority} in {payload.department}.",
        event_type="update",
    )
    db.add(timeline)
    db.commit()
    db.refresh(persona_record)

    return persona_record