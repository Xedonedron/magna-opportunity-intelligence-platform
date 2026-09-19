from __future__ import annotations

import re
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func, desc

from app.core.database import get_db
from app.models.user import User
from app.models.company import Company
from app.models.opportunity import Opportunity, TimelineEvent
from app.models.meeting import Meeting
from app.models.kyc_report import KYCReport
from urllib.parse import urlparse

from app.schemas.company import (
    CompanyCreate,
    CompanyUpdate,
    CompanyResponse,
    CompanyDetailResponse,
    CompanyListResponse,
    CompanyOpportunityCreate,
    CompanySimilarityMatch,
    CompanySimilarityCheckResponse,
    CompanyKYCSummaryResponse,
)
from app.schemas.opportunity import OpportunityResponse
from app.core.security import get_current_user, require_capability
from app.services.notification_service import NotificationService
from app.tasks import (
    send_opportunity_created_notification,
    run_kyc_pipeline_task,
)

router = APIRouter(tags=["companies"])

DOUBLE_SLDS = {
    "co.id", "ac.id", "go.id", "or.id", "sch.id", "web.id",
    "mil.id", "co.uk", "com.sg", "com.my", "co.jp", "com.au",
}
PUBLIC_SHARED_DOMAINS = {
    "instagram.com", "facebook.com", "linkedin.com", "twitter.com",
    "x.com", "linktr.ee", "sites.google.com", "github.com",
    "wa.me", "bit.ly", "google.com", "youtube.com", "drive.google.com",
}


def extract_root_domain(url: str | None) -> str | None:
    """Extracts the clean apex/root domain from a website URL.
    Handles schemes, ports, paths, subdomains, and Indonesian ccTLDs (.co.id).
    Filters out common public social/shared media domains to prevent false pooling.

    Examples:
    - 'https://www.telkom.co.id/id/about' -> 'telkom.co.id'
    - 'https://enterprise.telkom.co.id' -> 'telkom.co.id'
    - 'http://cas.co.id:8080' -> 'cas.co.id'
    - 'danone.com/' -> 'danone.com'
    - 'https://instagram.com/mybrand' -> None
    """
    if not url or not url.strip():
        return None
    u = url.strip().lower()
    if not (u.startswith("http://") or u.startswith("https://")):
        u = "https://" + u
    try:
        parsed = urlparse(u)
        hostname = parsed.hostname or ""
    except Exception:
        return None

    hostname = hostname.split(":")[0].strip(".")
    hostname = re.sub(r"^(www\d?|m)\.", "", hostname)
    if not hostname or "." not in hostname:
        return None

    parts = hostname.split(".")
    if len(parts) >= 3:
        last_two = ".".join(parts[-2:])
        if last_two in DOUBLE_SLDS:
            apex = ".".join(parts[-3:])
        else:
            apex = ".".join(parts[-2:])
    else:
        apex = hostname

    if apex in PUBLIC_SHARED_DOMAINS or hostname in PUBLIC_SHARED_DOMAINS:
        return None
    return apex


# Legal regex for canonical normalized name
LEGAL_PREFIX_PATTERN = re.compile(
    r"^(pt\.?|cv\.?|ud\.?|yayasan|koperasi|perum|perusahaan\s+perseroan|pd\.?|firma)\s+",
    re.IGNORECASE,
)
LEGAL_SUFFIX_PATTERN = re.compile(
    r"[\s,]+(\(?persero\)?|tbk\.?|ltd\.?|inc\.?|llc\.?|corp\.?|corporation|holding|holdings|co\.?|gmbh|bhd\.?|pte\.?\s*ltd\.?)$",
    re.IGNORECASE,
)
STANDALONE_LEGAL_TOKENS = re.compile(
    r"\b(persero|tbk)\b",
    re.IGNORECASE,
)
PUNCTUATION_RE = re.compile(r"[^\w\s]")


def compute_normalized_name(name: str) -> str:
    """Recursively strip legal prefixes and suffixes from company name to generate
    a canonical normalized key.
    Handles compound/multi-suffixes like 'PT Telkom Indonesia (Persero) Tbk' -> 'telkom indonesia'.
    """
    if not name:
        return ""
    key = name.strip().lower()

    # Iteratively strip legal prefixes and suffixes
    changed = True
    while changed:
        old = key
        key = LEGAL_PREFIX_PATTERN.sub("", key).strip()
        key = LEGAL_SUFFIX_PATTERN.sub("", key).strip()
        key = re.sub(r"\(\s*\)", "", key).strip()
        changed = (key != old)

    # Strip standalone residual persero / tbk enclosed in parentheses or punctuation
    key = STANDALONE_LEGAL_TOKENS.sub(" ", key)
    key = PUNCTUATION_RE.sub(" ", key)
    key = re.sub(r"\s+", " ", key).strip()
    return key or name.strip().lower()


@router.get("", response_model=CompanyListResponse)
async def list_companies(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    industry: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List companies with pagination, search, and opportunity counts."""
    query = db.query(Company)

    if search:
        search_clean = f"%{search.strip().lower()}%"
        query = query.filter(
            sa_func.lower(Company.name).like(search_clean)
            | sa_func.lower(Company.normalized_name).like(search_clean)
            | sa_func.lower(Company.industry).like(search_clean)
        )

    if industry:
        query = query.filter(Company.industry == industry)

    total = query.count()

    companies = (
        query.order_by(desc(Company.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for c in companies:
        resp = CompanyResponse(
            id=c.id,
            name=c.name,
            normalized_name=c.normalized_name,
            website=c.website,
            industry=c.industry,
            business_process=c.business_process,
            employee_count=c.employee_count,
            tech_stack=c.tech_stack,
            opportunities_count=len(c.opportunities),
            created_at=c.created_at,
            updated_at=c.updated_at,
        )
        items.append(resp)

    return CompanyListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/check-similarity", response_model=CompanySimilarityCheckResponse)
async def check_company_similarity(
    name: str = Query(..., min_length=1, description="Raw or typed company name to check for duplicates"),
    website: Optional[str] = Query(None, description="Company website URL to match against registered root domains"),
    threshold: float = Query(0.70, ge=0.0, le=1.0, description="Similarity threshold (0.0 - 1.0)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check if a company name or website domain has exact duplicates in the database.
    Used for live autocomplete deduplication guards before creating opportunities or folders.
    Deterministic deduplication cascade:
      1. Root domain matching (highest confidence)
      2. Exact recursive normalized name matching
    """
    norm_query = compute_normalized_name(name)
    query_domain = extract_root_domain(website) if website else None
    all_companies = db.query(Company).all()

    exact_match: Optional[CompanyResponse] = None
    matches: list[CompanySimilarityMatch] = []

    for c in all_companies:
        resp = CompanyResponse(
            id=c.id,
            name=c.name,
            normalized_name=c.normalized_name,
            website=c.website,
            industry=c.industry,
            business_process=c.business_process,
            employee_count=c.employee_count,
            tech_stack=c.tech_stack,
            opportunities_count=len(c.opportunities),
            created_at=c.created_at,
            updated_at=c.updated_at,
        )

        # 1. Root Domain Match (Highest priority & 100% confidence)
        c_domain = extract_root_domain(c.website) if c.website else None
        if query_domain and c_domain and query_domain == c_domain:
            if not exact_match:
                exact_match = resp
            matches.append(
                CompanySimilarityMatch(
                    company=resp,
                    similarity_score=1.0,
                    match_type="domain_match",
                )
            )
            continue

        # 2. Exact normalized match (100% confidence)
        if c.normalized_name == norm_query:
            matches.append(
                CompanySimilarityMatch(
                    company=resp,
                    similarity_score=1.0,
                    match_type="exact_normalized",
                )
            )

    # Sort matches: prioritize domain_match, then the folder with the most active opportunities
    matches.sort(
        key=lambda m: (
            1 if m.match_type == "domain_match" else 0,
            m.company.opportunities_count,
        ),
        reverse=True,
    )

    exact_match = matches[0].company if matches else None

    return CompanySimilarityCheckResponse(
        query=name,
        normalized_query=norm_query,
        exact_match=exact_match,
        has_similar=len(matches) > 0,
        matches=matches,
    )


@router.post("", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
async def create_company(
    data: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("create_edit")),
):
    """Create a new company folder."""
    norm_name = compute_normalized_name(data.name)
    input_domain = extract_root_domain(data.website) if data.website else None

    # Check 1: Duplicate root domain check (hard constraint)
    if input_domain:
        comps_with_web = db.query(Company).filter(Company.website.isnot(None)).all()
        for comp in comps_with_web:
            if extract_root_domain(comp.website) == input_domain:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Company with website domain '{input_domain}' already exists: '{comp.name}' (id: {comp.id})",
                )

    # Check 2: Duplicate normalized name check
    existing = db.query(Company).filter(Company.normalized_name == norm_name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Company with similar name already exists: '{existing.name}' (id: {existing.id})",
        )

    company = Company(
        name=data.name.strip(),
        normalized_name=norm_name,
        website=data.website,
        industry=data.industry,
        business_process=data.business_process,
        employee_count=data.employee_count,
        tech_stack=data.tech_stack or [],
    )
    db.add(company)
    db.commit()
    db.refresh(company)

    return CompanyResponse(
        id=company.id,
        name=company.name,
        normalized_name=company.normalized_name,
        website=company.website,
        industry=company.industry,
        business_process=company.business_process,
        employee_count=company.employee_count,
        tech_stack=company.tech_stack,
        opportunities_count=0,
        created_at=company.created_at,
        updated_at=company.updated_at,
    )


@router.get("/{company_id}", response_model=CompanyDetailResponse)
async def get_company(
    company_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get company detail including its list of child opportunities."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    opp_responses = [
        OpportunityResponse.model_validate(opp)
        for opp in company.opportunities
    ]

    return CompanyDetailResponse(
        id=company.id,
        name=company.name,
        normalized_name=company.normalized_name,
        website=company.website,
        industry=company.industry,
        business_process=company.business_process,
        employee_count=company.employee_count,
        tech_stack=company.tech_stack,
        opportunities_count=len(company.opportunities),
        created_at=company.created_at,
        updated_at=company.updated_at,
        opportunities=opp_responses,
    )


@router.get("/{company_id}/kyc-summary", response_model=CompanyKYCSummaryResponse)
async def get_company_kyc_summary(
    company_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get aggregated/latest KYC report insights for a company.
    Finds the most recent completed KYC report from any child opportunity.
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Find latest completed KYCReport across all opportunities under this company
    latest_kyc = (
        db.query(KYCReport, Opportunity)
        .join(Opportunity, Opportunity.id == KYCReport.opportunity_id)
        .filter(
            Opportunity.company_id == company_id,
            KYCReport.status == "completed",
            KYCReport.company_overview.isnot(None),
        )
        .order_by(KYCReport.completed_at.desc(), KYCReport.created_at.desc())
        .first()
    )

    if not latest_kyc:
        return CompanyKYCSummaryResponse(
            company_id=company.id,
            company_name=company.name,
            has_kyc=False,
        )

    kyc_report, opp = latest_kyc
    return CompanyKYCSummaryResponse(
        company_id=company.id,
        company_name=company.name,
        has_kyc=True,
        source_opportunity_id=opp.id,
        source_opportunity_title=opp.product or opp.company_name,
        kyc_version=kyc_report.version,
        completed_at=kyc_report.completed_at,
        executive_summary=kyc_report.executive_summary,
        company_overview=kyc_report.company_overview,
        industry_analysis=kyc_report.industry_analysis,
        business_model=kyc_report.business_model,
        company_location=kyc_report.company_location,
        competitor_analysis=kyc_report.competitor_analysis,
        potential_pain_points=kyc_report.potential_pain_points,
    )


@router.patch("/{company_id}", response_model=CompanyResponse)
async def update_company(
    company_id: uuid.UUID,
    data: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("create_edit")),
):
    """Update company details."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    update_dict = data.model_dump(exclude_unset=True)

    if "name" in update_dict and update_dict["name"]:
        update_dict["name"] = update_dict["name"].strip()
        update_dict["normalized_name"] = compute_normalized_name(update_dict["name"])

    for k, v in update_dict.items():
        setattr(company, k, v)

    db.commit()
    db.refresh(company)

    return CompanyResponse(
        id=company.id,
        name=company.name,
        normalized_name=company.normalized_name,
        website=company.website,
        industry=company.industry,
        business_process=company.business_process,
        employee_count=company.employee_count,
        tech_stack=company.tech_stack,
        opportunities_count=len(company.opportunities),
        created_at=company.created_at,
        updated_at=company.updated_at,
    )


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_company(
    company_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("delete")),
):
    """Delete a company and its child opportunities."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    db.delete(company)
    db.commit()
    return None


@router.post("/{company_id}/opportunities", response_model=OpportunityResponse, status_code=status.HTTP_201_CREATED)
async def create_company_opportunity(
    company_id: uuid.UUID,
    data: CompanyOpportunityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("create_edit")),
):
    """Create a new child opportunity nested under a company.
    Automatically inherits company name, website, and industry from the parent company folder.
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Parent company not found")

    # Inherit and construct company_name & product
    deal_title = data.deal_title.strip() if data.deal_title else None
    product = data.product or deal_title or "General Solution"
    
    # Store clean company name, or with deal title suffix for backward compat
    eff_company_name = company.name

    opportunity = Opportunity(
        company_id=company.id,
        company_name=eff_company_name,
        contact_name=data.contact_name,
        website=company.website,
        email=data.email,
        phone=data.phone,
        industry=company.industry,
        product=product,
        customer_needs=data.customer_needs,
        additional_notes=data.additional_notes,
        potential_revenue=data.potential_revenue,
        estimated_agenda_date=data.estimated_agenda_date,
        meeting_schedule=data.meeting_schedule,
        assigned_engineer=data.assigned_engineer,
        created_by=current_user.id,
        status=data.status or "New",
    )
    db.add(opportunity)
    db.flush()

    # Create meeting record if schedule provided
    if data.meeting_schedule:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        m_dt = data.meeting_schedule if data.meeting_schedule.tzinfo else data.meeting_schedule.replace(tzinfo=timezone.utc)
        opportunity.status = "Meeting Scheduled" if m_dt > now else "Meeting Done"

        initial_meeting = Meeting(
            opportunity_id=opportunity.id,
            title=f"Initial Discovery Call - {company.name} ({product})",
            date=data.meeting_schedule,
            location="Online / Google Meet",
            notes=f"Initial meeting for {company.name} > {product}.",
            created_by=current_user.id,
        )
        db.add(initial_meeting)

    # Log timeline event
    timeline_event = TimelineEvent(
        opportunity_id=opportunity.id,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        action="Opportunity Created",
        description=f"Opportunity for {company.name} ({product}) was created under folder '{company.name}'.",
        event_type="create",
    )
    db.add(timeline_event)

    # Dispatch notification
    NotificationService.notify_opportunity_created(
        db, opportunity, actor_id=current_user.id
    )

    db.commit()
    db.refresh(opportunity)

    # Trigger async notifications and kyc
    try:
        send_opportunity_created_notification.delay(str(opportunity.id))
    except Exception:
        pass

    try:
        run_kyc_pipeline_task.delay(str(opportunity.id))
    except Exception:
        pass

    return OpportunityResponse.model_validate(opportunity)
