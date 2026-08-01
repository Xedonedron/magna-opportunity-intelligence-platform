import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.models.opportunity import Opportunity
from app.models.kyc_report import KYCReport
from app.services.linkedin_service import linkedin_service

router = APIRouter(prefix="/api/linkedin", tags=["linkedin"])


class LinkedInSearchPayload(BaseModel):
    company_name: str


class LinkedInEnrichPayload(BaseModel):
    opportunity_id: str


@router.post("/company/search")
async def search_company_linkedin(
    payload: LinkedInSearchPayload,
    current_user: User = Depends(get_current_user),
):
    """
    Search LinkedIn for company details, headcount, specialties, and key insights.
    """
    if not payload.company_name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company name cannot be empty."
        )

    result = linkedin_service.search_company(payload.company_name)
    return result


@router.post("/company/posts")
async def get_company_posts_linkedin(
    payload: LinkedInSearchPayload,
    current_user: User = Depends(get_current_user),
):
    """
    Get recent company posts and updates from LinkedIn.
    """
    posts = linkedin_service.get_company_updates(payload.company_name)
    return {
        "company_name": payload.company_name,
        "total": len(posts),
        "posts": posts,
    }


@router.post("/company/executives")
async def get_company_executives_linkedin(
    payload: LinkedInSearchPayload,
    current_user: User = Depends(get_current_user),
):
    """
    Get key executives and decision makers for a company from LinkedIn.
    """
    executives = linkedin_service.get_company_executives(payload.company_name)
    return {
        "company_name": payload.company_name,
        "total": len(executives),
        "executives": executives,
    }


class LinkedInPeopleSearchPayload(BaseModel):
    company_name: str
    title_filter: Optional[str] = None


@router.post("/company/people")
async def get_company_people_linkedin(
    payload: LinkedInPeopleSearchPayload,
    current_user: User = Depends(get_current_user),
):
    """
    Search specific people, employees, and decision makers for a company on LinkedIn.
    """
    people = linkedin_service.get_company_people(
        company_name=payload.company_name,
        title_filter=payload.title_filter,
    )
    return {
        "company_name": payload.company_name,
        "title_filter": payload.title_filter,
        "total": len(people),
        "people": people,
    }


class LinkedInPersonProfilePayload(BaseModel):
    full_name: str
    company_name: Optional[str] = None


@router.post("/person/profile")
async def get_person_profile_linkedin(
    payload: LinkedInPersonProfilePayload,
    current_user: User = Depends(get_current_user),
):
    """
    Get detailed background, technical depth assessment, and presales briefing for a specific participant.
    """
    if not payload.full_name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name cannot be empty."
        )

    profile = linkedin_service.get_person_profile(
        full_name=payload.full_name,
        company_name=payload.company_name,
    )
    return profile


@router.post("/enrich/{opportunity_id}")
async def enrich_opportunity_kyc_linkedin(
    opportunity_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Enrich an existing Opportunity KYC Report with LinkedIn insights.
    """
    try:
        opp_uuid = uuid.UUID(opportunity_id) if isinstance(opportunity_id, str) else opportunity_id
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid UUID format.")

    opp = db.query(Opportunity).filter(Opportunity.id == opp_uuid).first()
    if not opp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found.")

    linkedin_info = linkedin_service.search_company(opp.company_name)
    executives = linkedin_service.get_company_executives(opp.company_name)
    posts = linkedin_service.get_company_updates(opp.company_name)

    # Attach/Update KYC Report in Database if exists
    kyc_report = db.query(KYCReport).filter(KYCReport.opportunity_id == opp.id).first()
    
    enrichment_summary = {
        "linkedin_insights": linkedin_info,
        "key_executives": executives,
        "recent_updates": posts,
    }

    if kyc_report:
        # Merge into existing raw json / context
        kyc_report.executives = json_dumps_safe(executives)
        db.commit()
        db.refresh(kyc_report)

    return {
        "status": "success",
        "opportunity_id": str(opp.id),
        "company_name": opp.company_name,
        "enrichment": enrichment_summary,
    }


def json_dumps_safe(obj: Any) -> str:
    try:
        return json.dumps(obj)
    except Exception:
        return str(obj)
