"""Prospecting API Router.

Integrates Lusha REST API v3 for contact search & enrichment,
and ProspectingService for outbound hypothesis generation and database conversion.
"""

from __future__ import annotations

import logging
import re
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import get_settings
from app.models.user import User
from app.models.company import Company
from app.models.company_contact import CompanyContact
from app.services.auth import decode_access_token
from app.services.lusha_service import lusha_service
from app.services.prospecting_service import prospecting_service
from app.services.excel_service import generate_contacts_excel
from app.schemas.prospecting import (
    LushaSearchRequest,
    LushaSearchResponse,
    LushaEnrichRequest,
    LushaEnrichResponse,
    LushaUsageResponse,
    ProspectingGenerateRequest,
    ProspectingGenerateResponse,
    ProspectingConvertRequest,
    ProspectingConvertResponse,
    CompanyCandidate,
    CompanySearchResponse,
    ExportExcelRequest,
    SaveStakeholdersRequest,
)

logger = logging.getLogger(__name__)
settings = get_settings()
security = HTTPBearer(auto_error=False)

router = APIRouter(prefix="/api/prospecting", tags=["prospecting"])


async def get_current_user_flexible(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Authenticate user via JWT or fallback to active user in development."""
    if credentials and credentials.credentials:
        payload = decode_access_token(credentials.credentials)
        if payload and payload.get("sub"):
            try:
                user_id = (
                    uuid.UUID(payload["sub"])
                    if isinstance(payload["sub"], str)
                    else payload["sub"]
                )
                user = db.query(User).filter(User.id == user_id).first()
                if user and user.is_active:
                    return user
            except Exception as e:
                logger.warning(f"[Auth] Failed to decode user id from token: {e}")

    # Fallback to first active user in database (for local dev/prototyping)
    dev_user = db.query(User).filter(User.is_active == True).first()
    if dev_user:
        return dev_user

    # If no users exist yet in DB, provision default consultant user
    default_user = User(
        email="consultant@magnaglobal.id",
        full_name="Magna Solution Consultant",
        role="admin",
        capabilities="view,create_edit,delete,generate_kyc,user_management,prospecting",
        is_active=True,
    )
    db.add(default_user)
    db.commit()
    db.refresh(default_user)
    return default_user


def check_prospecting_permission(user: User) -> User:
    """Enforce that prospecting feature is enabled and user has permissions."""
    settings = get_settings()
    if not settings.ENABLE_PROSPECTING:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Fitur Prospecting dinonaktifkan untuk seluruh akun.",
        )
    allowed_roles = {"lgo", "manager", "superadmin", "admin", "lead_gen", "managerial"}
    user_role = (user.role or "").lower()
    caps = [c.strip() for c in (user.capabilities or "").split(",")]
    if user_role not in allowed_roles and "prospecting" not in caps:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses fitur Lusha Prospecting terbatas untuk role LGO, Manager, dan Superadmin.",
        )
    return user


async def require_prospecting_user(
    user: User = Depends(get_current_user_flexible),
) -> User:
    """Dependency ensuring user has authorization to access Prospecting endpoints."""
    return check_prospecting_permission(user)


@router.get("/lusha/usage", response_model=LushaUsageResponse)
async def get_lusha_usage(user: User = Depends(require_prospecting_user)):
    """Retrieve current Lusha API usage, quota limits, and remaining credits."""
    data = await lusha_service.get_account_usage()
    if "error" in data:
        if data.get("rate_limit_reset_formatted"):
            return data
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gagal mengambil kuota Lusha API: {data['error']}",
        )
    return data


@router.get("/companies/search", response_model=CompanySearchResponse)
async def search_prospecting_companies(
    q: str = Query(..., min_length=1, description="Company name query, e.g. OCBC"),
    country: Optional[str] = Query("Indonesia", description="Target country"),
    db: Session = Depends(get_db),
    user: User = Depends(require_prospecting_user),
):
    """
    Search and disambiguate companies across MOIP internal database and Lusha prospecting.
    Enables user to pick the exact company entity before browsing employees.
    """
    cleaned_query = q.strip()
    results: List[CompanyCandidate] = []
    seen_domains = set()
    seen_names = set()

    # 1. Search MOIP internal Company database
    try:
        db_companies = (
            db.query(Company)
            .filter(
                or_(
                    Company.name.ilike(f"%{cleaned_query}%"),
                    Company.root_domain.ilike(f"%{cleaned_query}%"),
                )
            )
            .limit(5)
            .all()
        )
        for comp in db_companies:
            domain_norm = (comp.root_domain or "").lower().strip()
            name_norm = comp.name.lower().strip()
            if domain_norm:
                seen_domains.add(domain_norm)
            seen_names.add(name_norm)

            contact_count = db.query(CompanyContact).filter(CompanyContact.company_id == comp.id).count()

            results.append(
                CompanyCandidate(
                    company_id=str(comp.id),
                    name=comp.name,
                    domain=comp.root_domain or comp.website,
                    industry=comp.industry,
                    country="Indonesia",
                    in_database=True,
                    stakeholder_count=contact_count,
                )
            )
    except Exception as e:
        logger.warning(f"[Prospecting] Internal company search failed: {e}")

    # 2. Search Lusha Company Prospecting API
    try:
        lusha_comps = await lusha_service.search_companies(
            company_query=cleaned_query,
            country=country,
        )
        for lc in lusha_comps:
            d_norm = (lc.get("domain") or "").lower().strip()
            n_norm = (lc.get("name") or "").lower().strip()

            if (d_norm and d_norm in seen_domains) or (n_norm in seen_names):
                continue

            results.append(
                CompanyCandidate(
                    name=lc.get("name") or cleaned_query,
                    domain=lc.get("domain"),
                    industry=lc.get("industry"),
                    country=lc.get("country") or country,
                    city=lc.get("city"),
                    employee_count=lc.get("employee_count"),
                    in_database=False,
                    stakeholder_count=0,
                    logo_url=lc.get("logo_url"),
                )
            )
            if d_norm:
                seen_domains.add(d_norm)
            seen_names.add(n_norm)
    except Exception as e:
        logger.warning(f"[Prospecting] Lusha company search failed: {e}")

    if not results:
        results.append(
            CompanyCandidate(
                name=cleaned_query,
                country=country or "Indonesia",
                in_database=False,
            )
        )

    return CompanySearchResponse(
        success=True,
        query=cleaned_query,
        results=results,
        companies=results,
    )


@router.post("/lusha/search", response_model=LushaSearchResponse)
async def search_lusha_contacts(
    request: LushaSearchRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_prospecting_user),
):
    """
    Search candidate decision makers on Lusha by company name, country,
    seniority level, and job function.
    """
    if not request.company_name or not request.company_name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nama perusahaan wajib diisi untuk pencarian prospek.",
        )

    res = await lusha_service.search_contacts(
        company_name=request.company_name,
        company_domain=request.company_domain,
        country=request.country,
        seniority=request.seniority,
        job_function=request.job_function,
        job_titles=request.job_titles,
        page=request.page,
        limit=request.effective_limit,
    )

    if not res.get("success"):
        logger.warning(f"[Lusha Search Error] {res.get('message')}")
        # Return structured response with empty contacts rather than hard 500
        # so frontend displays helpful message
        return LushaSearchResponse(
            success=False,
            message=res.get("message", "Gagal melakukan pencarian kontak di Lusha."),
            total=0,
            page=request.page,
            contacts=[],
            rate_limit_reset_seconds=res.get("rate_limit_reset_seconds"),
            rate_limit_reset_formatted=res.get("rate_limit_reset_formatted"),
        )

    # Cross-reference existing contacts in internal directory
    if res.get("contacts"):
        try:
            contact_names = [c["full_name"].strip() for c in res["contacts"] if c.get("full_name")]
            if contact_names:
                db_contacts = (
                    db.query(CompanyContact)
                    .filter(func.lower(CompanyContact.name).in_([n.lower() for n in contact_names]))
                    .all()
                )
                saved_map = {c.name.lower(): str(c.id) for c in db_contacts if c.name}
                for c in res["contacts"]:
                    fn = c.get("full_name", "").strip().lower()
                    if fn in saved_map:
                        c["is_saved_in_directory"] = True
                        c["local_contact_id"] = saved_map[fn]
        except Exception as e:
            logger.warning(f"[Lusha Search] Failed checking local contacts: {e}")

    return res


@router.post("/lusha/enrich", response_model=LushaEnrichResponse)
async def enrich_lusha_contact(
    request: LushaEnrichRequest,
    user: User = Depends(require_prospecting_user),
):
    """
    Enrich/reveal verified email and direct phone numbers for Lusha contact IDs.
    Consumes credits on the Lusha account. Supports granular reveals (emails, phones)
    and batch processing.
    """
    contact_ids = request.get_effective_ids()
    if not contact_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contact ID Lusha wajib diisi untuk enrich data.",
        )

    # Backward compatibility for single contact caller and tests
    if request.contact_id and not request.contact_ids:
        res = await lusha_service.enrich_contact(
            contact_id=request.contact_id,
            reveal=request.reveal,
        )
        emails = res.get("emails", [])
        phones = res.get("phones", [])
        single_contact = {
            "id": request.contact_id,
            "full_name": "",
            "job_title": "",
            "emails": emails,
            "phones": phones,
        }
        return LushaEnrichResponse(
            success=res.get("success", True),
            contact_id=request.contact_id,
            emails=emails,
            phones=phones,
            contact=single_contact,
            contacts=[single_contact],
            credits_charged=len(request.reveal) if request.reveal else 2,
            message=res.get("message", "Kontak berhasil diperkaya dengan data terverifikasi Lusha."),
        )

    # Use enrich_contacts for multi/batch contact reveal
    results = await lusha_service.enrich_contacts(
        contact_ids=contact_ids,
        reveal=request.reveal,
    )

    enriched_items = []
    total_emails = []
    total_phones = []

    for item in results:
        email_list = [e.get("email") for e in item.get("emails", []) if e.get("email")]
        phone_list = [p.get("number") for p in item.get("phones", []) if p.get("number")]
        total_emails.extend(email_list)
        total_phones.extend(phone_list)
        
        # Format contact result
        full_n = item.get("fullName") or f"{item.get('firstName', '')} {item.get('lastName', '')}".strip()
        job_t = item.get("jobTitle")
        if isinstance(job_t, dict):
            job_t = job_t.get("title")
        job_t_str = str(job_t or "")

        enriched_items.append({
            "id": str(item.get("id")),
            "full_name": full_n,
            "job_title": job_t_str,
            "emails": email_list,
            "phones": phone_list,
            "linkedin_url": item.get("linkedinUrl", ""),
        })

    first_item = enriched_items[0] if enriched_items else None
    reveal_multiplier = len(request.reveal) if request.reveal else 2
    credits_charged = len(contact_ids) * reveal_multiplier

    return LushaEnrichResponse(
        success=True,
        contact_id=contact_ids[0],
        emails=first_item["emails"] if first_item else [],
        phones=first_item["phones"] if first_item else [],
        contact=first_item,
        contacts=enriched_items,
        credits_charged=credits_charged,
        message=f"Berhasil membuka data {len(enriched_items)} kontak via Lusha.",
    )


@router.post("/save-to-stakeholders")
async def save_prospects_to_stakeholders(
    request: SaveStakeholdersRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_prospecting_user),
):
    """
    Persist revealed contacts to MOIP Stakeholder Directory (company_contacts table).
    Links or creates the Company entity so unlocked contacts are permanently available.
    """
    if not request.company_name or not request.company_name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nama perusahaan wajib disertakan.",
        )

    clean_name = request.company_name.strip()
    
    # 1. Find or create company
    company = db.query(Company).filter(
        or_(
            Company.name.ilike(clean_name),
            Company.root_domain.ilike(request.company_domain.strip()) if request.company_domain else False,
        )
    ).first()

    if not company:
        company = Company(
            name=clean_name,
            normalized_name=clean_name.lower().strip(),
            root_domain=request.company_domain,
            website=f"https://{request.company_domain}" if request.company_domain else None,
            industry=request.industry,
        )
        db.add(company)
        db.commit()
        db.refresh(company)

    saved_contacts = []
    for c in request.contacts:
        if not c.name or not c.name.strip():
            continue

        existing = db.query(CompanyContact).filter(
            CompanyContact.company_id == company.id,
            or_(
                CompanyContact.name.ilike(c.name.strip()),
                CompanyContact.email.ilike(c.email.strip()) if c.email else False,
            )
        ).first()

        if existing:
            if c.job_title and not existing.job_title:
                existing.job_title = c.job_title
            if c.email and not existing.email:
                existing.email = c.email
            if c.phone and not existing.phone:
                existing.phone = c.phone
            saved_contacts.append(existing)
        else:
            new_contact = CompanyContact(
                company_id=company.id,
                name=c.name.strip(),
                job_title=c.job_title or "Stakeholder",
                email=c.email,
                phone=c.phone,
                notes="Diperoleh dari Lusha Prospecting Hub",
            )
            db.add(new_contact)
            saved_contacts.append(new_contact)

    db.commit()

    return {
        "success": True,
        "company_id": str(company.id),
        "company_name": company.name,
        "saved_count": len(saved_contacts),
        "message": f"{len(saved_contacts)} kontak berhasil disimpan ke Stakeholder Directory {company.name}.",
    }


@router.post("/export-excel")
async def export_prospects_to_excel(
    request: ExportExcelRequest,
    user: User = Depends(require_prospecting_user),
):
    """
    Export revealed contacts directly to formatted Excel (.xlsx) file.
    Columns: No, Nama, Job Title / Jabatan, Email, Nomor Telepon.
    """
    raw_contacts = [c.model_dump() for c in request.contacts]
    excel_bytes = generate_contacts_excel(
        company_name=request.company_name,
        contacts=raw_contacts,
    )

    safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', request.company_name).strip('_') or "Perusahaan"
    filename = f"Kontak_Lusha_{safe_name}.xlsx"

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


@router.post("/generate", response_model=ProspectingGenerateResponse)
async def generate_prospecting_dossier(
    request: ProspectingGenerateRequest,
    user: User = Depends(require_prospecting_user),
):
    """
    Generate sales hypothesis, solution mapping, multi-channel outreach copy,
    and discovery questions for the targeted enterprise stakeholder.
    """
    if not request.company_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nama perusahaan wajib diisi.",
        )

    return prospecting_service.generate_dossier(request)


@router.post("/convert", response_model=ProspectingConvertResponse)
async def convert_to_opportunity(
    request: ProspectingConvertRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_prospecting_user),
):
    """
    Atomically convert a prospect into MOIP database records:
    1. Company entity (upsert by normalized name).
    2. CompanyContact entity (tagged source='lusha_outbound').
    3. Opportunity pipeline entity with mapped solution & prefilled needs.
    4. Timeline event recording.
    """
    if not request.company_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nama perusahaan wajib disertakan dalam konversi.",
        )

    try:
        result = prospecting_service.convert_prospect(
            db=db,
            req=request,
            current_user=current_user,
        )
        return result
    except Exception as e:
        logger.error(f"[Prospecting Convert Error] {e}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gagal mengonversi prospek ke pipeline deal: {str(e)}",
        )
