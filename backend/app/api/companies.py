from __future__ import annotations

import re
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func, desc

from app.core.database import get_db
from app.models.user import User
from app.models.company import Company
from app.models.company_contact import CompanyContact
from app.models.opportunity import Opportunity, TimelineEvent
from app.models.meeting import Meeting
from app.models.kyc_report import KYCReport
from urllib.parse import urlparse
from app.services.excel_service import generate_contacts_excel

from app.schemas.company import (
    CompanyCreate,
    CompanyUpdate,
    CompanyResponse,
    CompanyDetailResponse,
    CompanyListResponse,
    CompanyOpportunityCreate,
    CompanyMergeResponse,
    CompanySimilarityMatch,
    CompanySimilarityCheckResponse,
    CompanyKYCSummaryResponse,
)
from app.schemas.opportunity import OpportunityResponse
from app.core.security import get_current_user, require_capability, normalize_role
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


def resolve_or_create_company(
    db: Session,
    name: str,
    website: str | None = None,
    company_domain: str | None = None,
    industry: str | None = None,
    employee_count: str | None = None,
) -> Company:
    """Centralized helper to resolve an existing Company (by root_domain or normalized_name)
    or create a canonical Company record with normalized_name and root_domain populated.
    """
    clean_name = (name or "").strip()
    norm_name = compute_normalized_name(clean_name)

    eff_website = website.strip() if website and website.strip() else None
    if not eff_website and company_domain and company_domain.strip():
        dom_clean = company_domain.strip()
        eff_website = dom_clean if dom_clean.startswith(("http://", "https://")) else f"https://{dom_clean}"

    req_domain = extract_root_domain(eff_website or company_domain)

    company = None
    # 1. Primary Gold Standard: Match by Root Domain if available
    if req_domain:
        company = db.query(Company).filter(Company.root_domain == req_domain).first()

    # 2. Secondary: Fallback to normalized company name or case-insensitive exact name
    if not company and clean_name:
        company = (
            db.query(Company)
            .filter(
                (Company.normalized_name == norm_name)
                | (sa_func.lower(Company.name) == clean_name.lower())
            )
            .first()
        )

    if company:
        if not company.normalized_name and norm_name:
            company.normalized_name = norm_name
        if not company.website and eff_website:
            company.website = eff_website
        if not company.root_domain and req_domain:
            company.root_domain = req_domain
        if not company.industry and industry:
            company.industry = industry
        if not company.employee_count and employee_count:
            company.employee_count = employee_count
        return company

    new_comp = Company(
        name=clean_name,
        normalized_name=norm_name,
        website=eff_website,
        root_domain=req_domain,
        industry=industry,
        employee_count=employee_count,
    )
    db.add(new_comp)
    db.flush()
    return new_comp


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
    # Subquery for opportunity counts — eliminates N+1
    opp_count_sq = (
        db.query(
            Opportunity.company_id,
            sa_func.count(Opportunity.id).label("cnt"),
        )
        .group_by(Opportunity.company_id)
        .subquery()
    )

    query = (
        db.query(Company, sa_func.coalesce(opp_count_sq.c.cnt, 0).label("opp_cnt"))
        .outerjoin(opp_count_sq, Company.id == opp_count_sq.c.company_id)
    )

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

    rows = (
        query.order_by(desc(Company.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for c, opp_cnt in rows:
        resp = CompanyResponse(
            id=c.id,
            name=c.name,
            normalized_name=c.normalized_name,
            website=c.website,
            industry=c.industry,
            business_process=c.business_process,
            employee_count=c.employee_count,
            tech_stack=c.tech_stack,
            opportunities_count=opp_cnt,
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

    matches: list[CompanySimilarityMatch] = []
    seen_ids: set[uuid.UUID] = set()

    # Subquery for opportunity counts to avoid N+1
    opp_count_sq = (
        db.query(Opportunity.company_id, sa_func.count(Opportunity.id).label("cnt"))
        .group_by(Opportunity.company_id)
        .subquery()
    )

    def _to_resp(c: Company, opp_cnt: int = 0) -> CompanyResponse:
        return CompanyResponse(
            id=c.id,
            name=c.name,
            normalized_name=c.normalized_name,
            website=c.website,
            industry=c.industry,
            business_process=c.business_process,
            employee_count=c.employee_count,
            tech_stack=c.tech_stack,
            opportunities_count=opp_cnt,
            created_at=c.created_at,
            updated_at=c.updated_at,
        )

    # 1. Root Domain Match (Highest priority & 100% confidence) — indexed query
    if query_domain:
        domain_rows = (
            db.query(Company, sa_func.coalesce(opp_count_sq.c.cnt, 0))
            .outerjoin(opp_count_sq, Company.id == opp_count_sq.c.company_id)
            .filter(Company.root_domain == query_domain)
            .all()
        )
        for c, cnt in domain_rows:
            seen_ids.add(c.id)
            matches.append(
                CompanySimilarityMatch(
                    company=_to_resp(c, cnt),
                    similarity_score=1.0,
                    match_type="domain_match",
                )
            )

    # 2. Exact normalized match (100% confidence) — indexed query
    norm_rows = (
        db.query(Company, sa_func.coalesce(opp_count_sq.c.cnt, 0))
        .outerjoin(opp_count_sq, Company.id == opp_count_sq.c.company_id)
        .filter(Company.normalized_name == norm_query)
        .all()
    )
    for c, cnt in norm_rows:
        if c.id not in seen_ids:
            matches.append(
                CompanySimilarityMatch(
                    company=_to_resp(c, cnt),
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

    # Check 1: Duplicate root domain check (hard constraint) — indexed query
    if input_domain:
        dup_domain = db.query(Company).filter(Company.root_domain == input_domain).first()
        if dup_domain:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Company with website domain '{input_domain}' already exists: '{dup_domain.name}' (id: {dup_domain.id})",
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
        root_domain=input_domain,
        industry=data.industry,
        business_process=data.business_process,
        employee_count=data.employee_count,
        tech_stack=data.tech_stack or [],
    )
    db.add(company)
    db.flush()

    # Automatically create primary stakeholder if contact_name was supplied
    if data.contact_name and data.contact_name.strip():
        contact = CompanyContact(
            company_id=company.id,
            name=data.contact_name.strip(),
            email=str(data.contact_email).strip() if data.contact_email else None,
            phone=data.contact_phone.strip() if data.contact_phone else None,
            is_primary=True,
        )
        db.add(contact)

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
        new_norm = compute_normalized_name(update_dict["name"])
        conflict_name = (
            db.query(Company)
            .filter(Company.id != company_id, Company.normalized_name == new_norm)
            .first()
        )
        if conflict_name:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Perusahaan dengan nama serupa ('{conflict_name.name}') sudah terdaftar.",
            )
        update_dict["normalized_name"] = new_norm

    if "website" in update_dict:
        new_domain = extract_root_domain(update_dict["website"])
        if new_domain:
            conflict_domain = (
                db.query(Company)
                .filter(Company.id != company_id, Company.root_domain == new_domain)
                .first()
            )
            if conflict_domain:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Domain '{new_domain}' sudah digunakan oleh perusahaan '{conflict_domain.name}'.",
                )
        update_dict["root_domain"] = new_domain

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

    # Stakeholder linking / creation logic
    primary_contact_id = None
    contact_name = data.contact_name
    email = data.email
    phone = data.phone

    if data.primary_contact_id:
        contact = db.query(CompanyContact).filter(
            CompanyContact.id == data.primary_contact_id,
            CompanyContact.company_id == company.id,
        ).first()
        if contact:
            primary_contact_id = contact.id
            contact_name = contact.name
            email = contact.email or email
            phone = contact.phone or phone
    elif data.contact_name and data.contact_name.strip():
        # Check existing contact by name (case-insensitive) or email
        existing_contact = db.query(CompanyContact).filter(
            CompanyContact.company_id == company.id,
            sa_func.lower(CompanyContact.name) == data.contact_name.strip().lower(),
        ).first()
        if not existing_contact and data.email:
            existing_contact = db.query(CompanyContact).filter(
                CompanyContact.company_id == company.id,
                sa_func.lower(CompanyContact.email) == str(data.email).strip().lower(),
            ).first()

        if existing_contact:
            primary_contact_id = existing_contact.id
            contact_name = existing_contact.name
            email = existing_contact.email or email
            phone = existing_contact.phone or phone
        else:
            has_contacts = db.query(CompanyContact).filter(CompanyContact.company_id == company.id).first() is not None
            new_contact = CompanyContact(
                company_id=company.id,
                name=data.contact_name.strip(),
                email=str(data.email).strip() if data.email else None,
                phone=data.phone.strip() if data.phone else None,
                is_primary=not has_contacts,
            )
            db.add(new_contact)
            db.flush()
            primary_contact_id = new_contact.id
            contact_name = new_contact.name
            email = new_contact.email
            phone = new_contact.phone

    from app.api.opportunities import _resolve_engineer_assignment
    resolved_eng_name, resolved_eng_id = _resolve_engineer_assignment(
        db,
        assigned_engineer=data.assigned_engineer,
        assigned_engineer_id=data.assigned_engineer_id,
    )

    opportunity = Opportunity(
        company_id=company.id,
        primary_contact_id=primary_contact_id,
        company_name=eff_company_name,
        contact_name=contact_name,
        website=company.website,
        email=email,
        phone=phone,
        industry=company.industry,
        product=product,
        customer_needs=data.customer_needs,
        additional_notes=data.additional_notes,
        potential_revenue=data.potential_revenue,
        estimated_agenda_date=data.estimated_agenda_date,
        meeting_schedule=data.meeting_schedule,
        assigned_engineer=resolved_eng_name,
        assigned_engineer_id=resolved_eng_id,
        created_by=current_user.id,
        status=data.status or "Lead In",
    )
    db.add(opportunity)
    db.flush()

    # Create meeting record if schedule provided
    if data.meeting_schedule:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        m_dt = data.meeting_schedule if data.meeting_schedule.tzinfo else data.meeting_schedule.replace(tzinfo=timezone.utc)
        opportunity.status = "Contact Made" if m_dt > now else "Needs Defined"

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


@router.post(
    "/{target_company_id}/merge/{source_company_id}",
    response_model=CompanyMergeResponse,
)
async def merge_companies(
    target_company_id: uuid.UUID,
    source_company_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atomically merge source_company into target_company (restricted to Admin / Manager).
    Reassigns all Opportunity and CompanyContact records (deduplicating matching contacts
    and resolving is_primary conflicts) and deletes source_company.
    """
    user_role = normalize_role(current_user.role)
    if user_role not in ("admin", "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hanya Admin atau Manager yang memiliki izin untuk menggabungkan folder perusahaan.",
        )

    if target_company_id == source_company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tidak dapat menggabungkan perusahaan ke dirinya sendiri.",
        )

    target_company = db.query(Company).filter(Company.id == target_company_id).first()
    if not target_company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target company not found")

    source_company = db.query(Company).filter(Company.id == source_company_id).first()
    if not source_company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source company not found")

    source_company_name = source_company.name

    # 1. Enrich target_company metadata from source_company if missing on target
    if not target_company.website and source_company.website:
        target_company.website = source_company.website
    if not target_company.root_domain and source_company.root_domain:
        target_company.root_domain = source_company.root_domain
    if not target_company.industry and source_company.industry:
        target_company.industry = source_company.industry
    if not target_company.business_process and source_company.business_process:
        target_company.business_process = source_company.business_process
    if not target_company.employee_count and source_company.employee_count:
        target_company.employee_count = source_company.employee_count
    if not target_company.tech_stack and source_company.tech_stack:
        target_company.tech_stack = source_company.tech_stack

    # 2. Merge & deduplicate CompanyContact records
    target_contacts = (
        db.query(CompanyContact)
        .filter(CompanyContact.company_id == target_company.id)
        .all()
    )
    source_contacts = (
        db.query(CompanyContact)
        .filter(CompanyContact.company_id == source_company.id)
        .all()
    )

    target_has_primary = any(c.is_primary for c in target_contacts)
    target_by_email: dict[str, CompanyContact] = {}
    target_by_name: dict[str, CompanyContact] = {}
    for tc in target_contacts:
        if tc.email and tc.email.strip():
            target_by_email[tc.email.strip().lower()] = tc
        if tc.name and tc.name.strip():
            target_by_name[tc.name.strip().lower()] = tc

    moved_contacts_count = 0
    deduplicated_contacts_count = 0
    contact_id_remap: dict[uuid.UUID, uuid.UUID] = {}

    for sc in source_contacts:
        sc_email_key = sc.email.strip().lower() if sc.email and sc.email.strip() else None
        sc_name_key = sc.name.strip().lower() if sc.name and sc.name.strip() else None

        matched_tc = None
        if sc_email_key and sc_email_key in target_by_email:
            matched_tc = target_by_email[sc_email_key]
        elif sc_name_key and sc_name_key in target_by_name:
            matched_tc = target_by_name[sc_name_key]

        if matched_tc:
            # Enrich missing fields on target contact before deleting duplicate source contact
            if not matched_tc.email and sc.email:
                matched_tc.email = sc.email
            if not matched_tc.phone and sc.phone:
                matched_tc.phone = sc.phone
            if not matched_tc.job_title and sc.job_title:
                matched_tc.job_title = sc.job_title
            if not matched_tc.department and sc.department:
                matched_tc.department = sc.department
            if not matched_tc.linkedin_url and sc.linkedin_url:
                matched_tc.linkedin_url = sc.linkedin_url
            if not matched_tc.notes and sc.notes:
                matched_tc.notes = sc.notes
            if sc.is_primary and not target_has_primary:
                matched_tc.is_primary = True
                target_has_primary = True

            contact_id_remap[sc.id] = matched_tc.id
            deduplicated_contacts_count += 1
        else:
            sc.company_id = target_company.id
            if sc.is_primary:
                if target_has_primary:
                    sc.is_primary = False
                else:
                    target_has_primary = True
            moved_contacts_count += 1
            if sc_email_key:
                target_by_email[sc_email_key] = sc
            if sc_name_key:
                target_by_name[sc_name_key] = sc

    # 3. Reassign Opportunity records from source_company to target_company
    source_opportunities = (
        db.query(Opportunity)
        .filter(Opportunity.company_id == source_company.id)
        .all()
    )
    moved_opportunities_count = 0

    for opp in source_opportunities:
        opp.company_id = target_company.id
        opp.company_name = target_company.name
        if not opp.website and target_company.website:
            opp.website = target_company.website
        if not opp.industry and target_company.industry:
            opp.industry = target_company.industry

        if opp.primary_contact_id and opp.primary_contact_id in contact_id_remap:
            opp.primary_contact_id = contact_id_remap[opp.primary_contact_id]

        db.add(
            TimelineEvent(
                opportunity_id=opp.id,
                actor_id=current_user.id,
                actor_name=current_user.full_name,
                action="Company Folder Merged",
                description=(
                    f"Opportunity moved from duplicate folder '{source_company_name}' "
                    f"into canonical folder '{target_company.name}'."
                ),
                event_type="update",
            )
        )
        moved_opportunities_count += 1

    # Also remap any other opportunity in DB referencing a deduplicated source contact
    if contact_id_remap:
        for old_cid, new_cid in contact_id_remap.items():
            db.query(Opportunity).filter(Opportunity.primary_contact_id == old_cid).update(
                {Opportunity.primary_contact_id: new_cid},
                synchronize_session=False,
            )
            dup_contact = db.query(CompanyContact).filter(CompanyContact.id == old_cid).first()
            if dup_contact:
                db.delete(dup_contact)

    db.flush()

    # 4. Delete source_company after detaching moved relationships
    db.refresh(source_company)
    db.delete(source_company)
    db.commit()
    db.refresh(target_company)

    total_target_opps = (
        db.query(sa_func.count(Opportunity.id))
        .filter(Opportunity.company_id == target_company.id)
        .scalar()
        or 0
    )

    target_resp = CompanyResponse(
        id=target_company.id,
        name=target_company.name,
        normalized_name=target_company.normalized_name,
        website=target_company.website,
        industry=target_company.industry,
        business_process=target_company.business_process,
        employee_count=target_company.employee_count,
        tech_stack=target_company.tech_stack,
        opportunities_count=total_target_opps,
        created_at=target_company.created_at,
        updated_at=target_company.updated_at,
    )

    return CompanyMergeResponse(
        target_company=target_resp,
        source_company_id=source_company_id,
        source_company_name=source_company_name,
        moved_opportunities_count=moved_opportunities_count,
        moved_contacts_count=moved_contacts_count,
        deduplicated_contacts_count=deduplicated_contacts_count,
        message=(
            f"Successfully merged '{source_company_name}' into '{target_company.name}' "
            f"({moved_opportunities_count} opportunities moved, "
            f"{moved_contacts_count} contacts moved, "
            f"{deduplicated_contacts_count} duplicate contacts consolidated)."
        ),
    )


@router.get("/{company_id}/contacts/export-excel")
async def export_company_stakeholders_excel(
    company_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export all stakeholders of a company to Excel (.xlsx) file with standard 4 columns."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perusahaan tidak ditemukan.",
        )

    contacts = db.query(CompanyContact).filter(CompanyContact.company_id == company_id).all()
    raw_contacts = [
        {
            "name": c.name,
            "job_title": c.job_title,
            "email": c.email,
            "phone": c.phone,
        }
        for c in contacts
    ]

    excel_bytes = generate_contacts_excel(
        company_name=company.name,
        contacts=raw_contacts,
    )

    safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', company.name).strip('_') or "Company"
    filename = f"Stakeholders_{safe_name}.xlsx"

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )
