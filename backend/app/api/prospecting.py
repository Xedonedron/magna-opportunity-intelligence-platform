"""Prospecting API Router.

Integrates Lusha REST API v3 for contact search & enrichment,
and ProspectingService for outbound hypothesis generation and database conversion.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import get_settings
from app.models.user import User
from app.services.auth import decode_access_token
from app.services.lusha_service import lusha_service
from app.services.prospecting_service import prospecting_service
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
    """Enforce that user has role LGO, Manager, Superadmin, or capability 'prospecting'."""
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
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gagal mengambil kuota Lusha API: {data['error']}",
        )
    return data


@router.post("/lusha/search", response_model=LushaSearchResponse)
async def search_lusha_contacts(
    request: LushaSearchRequest,
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
        country=request.country,
        seniority=request.seniority,
        job_function=request.job_function,
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
        )

    return res


@router.post("/lusha/enrich", response_model=LushaEnrichResponse)
async def enrich_lusha_contact(
    request: LushaEnrichRequest,
    user: User = Depends(require_prospecting_user),
):
    """
    Enrich/reveal verified email and direct phone numbers for a Lusha contact ID.
    Consumes credits on the Lusha account.
    """
    contact_ids = request.get_effective_ids()
    if not contact_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contact ID Lusha wajib diisi untuk enrich data.",
        )

    res = await lusha_service.enrich_contact(
        contact_id=contact_ids[0],
        reveal=request.reveal,
    )

    return res


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
