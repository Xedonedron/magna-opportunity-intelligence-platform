from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
import uuid

from app.core.database import get_db
from app.models.user import User
from app.models.audit_log import AuditLog
from app.models.opportunity import Opportunity
from app.models.meeting import Meeting
from app.models.kyc_report import KYCReport
from app.models.master_solution import MasterSolution
from app.schemas.master_solution import (
    MasterSolutionCreate,
    MasterSolutionUpdate,
    MasterSolutionResponse,
    MasterSolutionListResponse,
)
from app.core.solutions_catalog import solutions_catalog
from app.core.security import get_current_user, require_superadmin
from app.services.audit_service import AuditService

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/logs")
def get_system_logs(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_superadmin)
):
    """Retrieve all audit logs across the entire system."""
    query = db.query(AuditLog)
    total = query.count()
    items = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    
    log_items = []
    for log in items:
        log_items.append({
            "id": str(log.id),
            "user_email": log.user.email if log.user else "System",
            "user_name": log.user.full_name if log.user else "System",
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": str(log.entity_id),
            "created_at": log.created_at.isoformat(),
            "extra_data": log.extra_data,
        })
    return {"items": log_items, "total": total}

@router.get("/metrics")
def get_system_metrics(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_superadmin)
):
    """Retrieve operational system metrics (KYC generation stats, user activity)."""
    kyc_stats = db.query(
        KYCReport.status, func.count(KYCReport.id)
    ).group_by(KYCReport.status).all()
    
    kyc_status_breakdown = {status: count for status, count in kyc_stats}
    
    total_opportunities = db.query(Opportunity).count()
    total_meetings = db.query(Meeting).count()
    total_kyc_reports = db.query(KYCReport).count()
    total_users = db.query(User).count()
    
    role_stats = db.query(
        User.role, func.count(User.id)
    ).group_by(User.role).all()
    user_roles_breakdown = {role: count for role, count in role_stats}

    return {
        "totals": {
            "opportunities": total_opportunities,
            "meetings": total_meetings,
            "kyc_reports": total_kyc_reports,
            "users": total_users
        },
        "kyc_status_breakdown": kyc_status_breakdown,
        "user_roles_breakdown": user_roles_breakdown
    }


from pydantic import BaseModel

class UserUpdatePayload(BaseModel):
    role: str
    capabilities: str
    is_active: bool | None = None


@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_superadmin)
):
    """Retrieve all users with activity telemetry (Super Admin only)."""
    users = db.query(User).order_by(User.created_at.desc()).all()
    audit_service = AuditService(db)

    result = []
    for u in users:
        summary = audit_service.get_user_activity_summary(u.id)
        last_active = u.last_active_at or u.last_login or u.created_at

        result.append({
            "id": str(u.id),
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "is_active": u.is_active,
            "capabilities": u.capabilities,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_login": u.last_login.isoformat() if u.last_login else None,
            "last_active_at": last_active.isoformat() if last_active else None,
            "activity_summary": summary,
        })
    return result


@router.get("/users/{user_id}/activity")
def get_user_activity_history(
    user_id: uuid.UUID,
    page: int = 1,
    page_size: int = 20,
    category: Optional[str] = None,
    range: Optional[str] = None,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_superadmin),
):
    """Retrieve granular chronological activity log for a specific user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    audit_service = AuditService(db)
    activities = audit_service.get_user_detailed_activities(
        user_id=user_id,
        page=page,
        page_size=page_size,
        category=category,
        range_filter=range,
    )
    summary = audit_service.get_user_activity_summary(user_id)
    last_active = user.last_active_at or user.last_login or user.created_at

    return {
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": user.is_active,
            "capabilities": user.capabilities,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "last_login": user.last_login.isoformat() if user.last_login else None,
            "last_active_at": last_active.isoformat() if last_active else None,
        },
        "summary": summary,
        **activities,
    }


@router.patch("/users/{user_id}")
def update_user_access(
    user_id: uuid.UUID,
    payload: UserUpdatePayload,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_superadmin)
):
    """Update role, capabilities, and active status for a user (Super Admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent lockouts: superadmin cannot demote or deactivate themselves
    if user.id == _admin.id:
        if payload.role != "superadmin" or (payload.is_active is not None and not payload.is_active):
            raise HTTPException(
                status_code=400,
                detail="Superadmin tidak dapat mengubah role atau menonaktifkan akun sendiri untuk mencegah lockout."
            )

    old_vals = {
        "role": user.role,
        "capabilities": user.capabilities,
        "is_active": user.is_active,
    }

    user.role = payload.role
    user.capabilities = payload.capabilities
    if payload.is_active is not None:
        user.is_active = payload.is_active

    new_vals = {
        "role": user.role,
        "capabilities": user.capabilities,
        "is_active": user.is_active,
    }

    try:
        AuditService(db).log(
            action="user_access_update",
            entity_type="User",
            entity_id=user.id,
            user_id=_admin.id,
            old_value=old_vals,
            new_value=new_vals,
            extra_data={"target_email": user.email, "target_name": user.full_name},
        )
    except Exception:
        pass
        
    db.commit()
    db.refresh(user)
    return {
        "status": "success",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "role": user.role,
            "capabilities": user.capabilities,
            "is_active": user.is_active
        }
    }


# Master Data (Pre-Sales & Industries) Configuration
MASTER_DATA = {
    "industries": [
        "Finance & Banking",
        "Insurance",
        "Manufacturing",
        "Healthcare",
        "Telecommunications",
        "Retail & E-commerce",
        "Government",
        "Technology & SaaS",
        "Oil & Gas",
        "Energy & Utilities",
        "Mining & Metals",
        "Agriculture & Agribusiness",
        "Construction & Real Estate",
        "Transportation & Logistics",
        "Education & EdTech",
        "Media & Entertainment",
        "Hospitality & Tourism",
        "Automotive",
        "Pharmaceuticals & Biotech",
        "Professional Services",
        "Food & Beverage",
        "Defense & Aerospace",
        "Non-Profit / NGO",
    ],
    "presales": [
        "Devi",
        "Bayu",
        "Gerry",
    ],
    "document_labels": [
        "MoM",
        "Compro",
        "Solution Brief",
        "Assessment List",
        "Technical Proposal",
    ],
}


class MasterDataPayload(BaseModel):
    industries: list[str]
    presales: list[str]
    document_labels: list[str] | None = None


@router.get("/master-data")
def get_master_data(_user: User = Depends(get_current_user)):
    """Retrieve master data options (Industries, Pre-Sales & Document Labels)."""
    return MASTER_DATA


@router.post("/master-data")
def update_master_data(
    payload: MasterDataPayload,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_superadmin)
):
    """Update master data options (Super Admin only)."""
    MASTER_DATA["industries"] = [i.strip() for i in payload.industries if i.strip()]
    MASTER_DATA["presales"] = [p.strip() for p in payload.presales if p.strip()]
    if payload.document_labels is not None:
        MASTER_DATA["document_labels"] = [l.strip() for l in payload.document_labels if l.strip()]

    try:
        AuditService(db).log(
            action="master_data_update",
            entity_type="System",
            entity_id=_admin.id,
            user_id=_admin.id,
            extra_data={
                "industries_count": len(MASTER_DATA["industries"]),
                "presales_count": len(MASTER_DATA["presales"]),
            },
        )
        db.commit()
    except Exception:
        pass

    return {"status": "success", "master_data": MASTER_DATA}


# System & AI Settings Configuration
class SystemSettingsPayload(BaseModel):
    llm_provider: Optional[str] = None  # "google" | "openai"
    ai_model: Optional[str] = None
    temperature: Optional[float] = None
    search_depth: Optional[str] = None
    max_results: Optional[int] = None
    hide_financial_numbers: Optional[bool] = None
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    openai_api_base: Optional[str] = None
    google_models: Optional[list[str]] = None
    openai_models: Optional[list[str]] = None


class TestConnectionPayload(BaseModel):
    provider: str
    model: Optional[str] = None
    api_key: Optional[str] = None
    api_base: Optional[str] = None


def mask_key(key: Optional[str]) -> str:
    if not key:
        return ""
    if len(key) <= 8:
        return "****"
    return f"{key[:4]}...{key[-4:]}"


DEFAULT_GOOGLE_MODELS: list[str] = []
DEFAULT_OPENAI_MODELS: list[str] = []


@router.get("/settings")
def get_system_settings_api(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user)
):
    """Get system and AI pipeline configuration settings."""
    import json
    from app.models.system_setting import SystemSetting
    from app.core.config import settings

    settings_rows = db.query(SystemSetting).all()
    kv = {s.key: s.value for s in settings_rows if s.value is not None}

    gemini_key = kv.get("gemini_api_key") or settings.active_gemini_api_key
    openai_key = kv.get("openai_api_key") or settings.OPENAI_API_KEY

    # Auto-seed system_settings table if keys exist in environment but missing in DB
    if not kv.get("gemini_api_key") and settings.active_gemini_api_key:
        db.merge(SystemSetting(key="gemini_api_key", value=settings.active_gemini_api_key))
        db.commit()
    if not kv.get("openai_api_key") and settings.OPENAI_API_KEY:
        db.merge(SystemSetting(key="openai_api_key", value=settings.OPENAI_API_KEY))
        db.commit()

    google_models = []
    if kv.get("google_models"):
        try:
            parsed_g = json.loads(kv["google_models"])
            if isinstance(parsed_g, list):
                google_models = [m.strip() for m in parsed_g if isinstance(m, str) and m.strip()]
        except Exception:
            google_models = []

    openai_models = []
    if kv.get("openai_models"):
        try:
            parsed_o = json.loads(kv["openai_models"])
            if isinstance(parsed_o, list):
                openai_models = [m.strip() for m in parsed_o if isinstance(m, str) and m.strip()]
        except Exception:
            openai_models = []

    current_model = kv.get("ai_model") or ""
    current_provider = kv.get("llm_provider") or settings.LLM_PROVIDER

    return {
        "llm_provider": current_provider,
        "ai_model": current_model,
        "temperature": float(kv.get("temperature", 0.0)),
        "search_depth": kv.get("search_depth", "advanced"),
        "max_results": int(kv.get("max_results", 5)),
        "hide_financial_numbers": kv.get("hide_financial_numbers", "false").lower() == "true",
        "has_gemini_key": bool(gemini_key),
        "masked_gemini_key": mask_key(gemini_key),
        "has_openai_key": bool(openai_key),
        "masked_openai_key": mask_key(openai_key),
        "openai_api_base": kv.get("openai_api_base") or settings.OPENAI_API_BASE,
        "google_models": google_models,
        "openai_models": openai_models,
    }


@router.patch("/settings")
def update_system_settings_api(
    payload: SystemSettingsPayload,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_superadmin)
):
    """Update AI system configuration and API keys (Superadmin only)."""
    import json
    from app.models.system_setting import SystemSetting

    updates = {}

    if payload.llm_provider is not None:
        updates["llm_provider"] = payload.llm_provider

    if payload.ai_model is not None:
        updates["ai_model"] = payload.ai_model.strip()

    if payload.temperature is not None:
        updates["temperature"] = str(payload.temperature)

    if payload.search_depth is not None:
        updates["search_depth"] = payload.search_depth

    if payload.max_results is not None:
        updates["max_results"] = str(payload.max_results)

    if payload.hide_financial_numbers is not None:
        updates["hide_financial_numbers"] = "true" if payload.hide_financial_numbers else "false"

    if payload.gemini_api_key is not None and not payload.gemini_api_key.startswith("****"):
        updates["gemini_api_key"] = payload.gemini_api_key.strip()

    if payload.openai_api_key is not None and not payload.openai_api_key.startswith("****"):
        updates["openai_api_key"] = payload.openai_api_key.strip()

    if payload.openai_api_base is not None:
        updates["openai_api_base"] = payload.openai_api_base.strip()

    # Handle google_models persistence without forcing auto-appends
    if payload.google_models is not None:
        cleaned_g = [m.strip() for m in payload.google_models if isinstance(m, str) and m.strip()]
        updates["google_models"] = json.dumps(cleaned_g)

    # Handle openai_models persistence without forcing auto-appends
    if payload.openai_models is not None:
        cleaned_o = [m.strip() for m in payload.openai_models if isinstance(m, str) and m.strip()]
        updates["openai_models"] = json.dumps(cleaned_o)

    for k, v in updates.items():
        row = db.query(SystemSetting).filter(SystemSetting.key == k).first()
        if not row:
            row = SystemSetting(key=k, value=v)
            db.add(row)
        else:
            row.value = v

    try:
        AuditService(db).log(
            action="system_settings_update",
            entity_type="SystemSetting",
            entity_id=_admin.id,
            user_id=_admin.id,
            extra_data={"updated_keys": list(updates.keys())},
        )
    except Exception:
        pass

    db.commit()
    return {"status": "success", "message": "System AI settings updated successfully."}


@router.post("/settings/test-connection")
async def test_llm_connection(
    payload: TestConnectionPayload,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_superadmin)
):
    """Test LLM connectivity and API key validity."""
    from app.core.llm import get_chat_llm
    from langchain_core.messages import HumanMessage

    try:
        raw_key = payload.api_key
        if raw_key and (raw_key.startswith("****") or "..." in raw_key):
            raw_key = None  # fallback to saved key in DB/settings

        llm = get_chat_llm(
            provider=payload.provider,
            model_name=payload.model,
            api_key=raw_key,
            api_base=payload.api_base,
            temperature=0.0,
            db=db
        )
        response = await llm.ainvoke([HumanMessage(content="Say 'OK'")])
        content = response.content
        if isinstance(content, list):
            content = "".join([c.get("text", "") if isinstance(c, dict) else str(c) for c in content])

        model_str = (payload.model or "").lower()
        warning = None
        if any(token in model_str for token in ["r1", "reasoner", "o1", "o3", "qwq"]):
            warning = (
                "Catatan: Model reasoning/thinking menghasilkan token berpikir internal yang memakan waktu lama "
                "dan rentan memicu '502 - Upstream stream ended' pada pipeline KYC berukuran besar. "
                "Disarankan menggunakan model instruction/chat non-reasoning (seperti glm-4-plus, deepseek-chat, atau gemini-2.5-flash)."
            )

        resp_msg = f"Koneksi berhasil! Provider '{payload.provider}' merespon: '{content.strip()}'"
        if warning:
            resp_msg += f" | {warning}"

        return {
            "status": "success",
            "message": resp_msg,
            "warning": warning,
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Koneksi gagal: {str(e)}",
        }


# =========================================================================
# AI Token Monitoring & Prompt Audit Endpoints (Superadmin Only)
# =========================================================================

@router.get("/ai/metrics")
def get_ai_monitoring_metrics(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_superadmin),
):
    """Retrieve operational KPIs, token breakdown, costs, and 14-day trends."""
    from app.services.ai_usage_service import get_metrics_summary
    return get_metrics_summary(db)


@router.get("/ai/usage/by-opportunity")
def get_ai_usage_by_opportunity(
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    page: int = 1,
    page_size: int = 15,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_superadmin),
):
    """Retrieve aggregated token usage per opportunity with company details."""
    from datetime import date
    from app.services.ai_usage_service import get_usage_by_opportunity

    d_from = date.fromisoformat(date_from) if date_from else None
    d_to = date.fromisoformat(date_to) if date_to else None

    return get_usage_by_opportunity(
        db=db,
        search=search,
        date_from=d_from,
        date_to=d_to,
        page=page,
        page_size=page_size,
    )


@router.get("/ai/usage/by-user")
def get_ai_usage_by_user(
    search: Optional[str] = None,
    role: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    page: int = 1,
    page_size: int = 15,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_superadmin),
):
    """Retrieve aggregated token usage per user to monitor consumption and detect abuse."""
    from datetime import date
    from app.services.ai_usage_service import get_usage_by_user

    d_from = date.fromisoformat(date_from) if date_from else None
    d_to = date.fromisoformat(date_to) if date_to else None

    return get_usage_by_user(
        db=db,
        search=search,
        role=role,
        date_from=d_from,
        date_to=d_to,
        page=page,
        page_size=page_size,
    )


@router.get("/ai/assistant-queries")
def get_ai_assistant_queries_audit(
    search: Optional[str] = None,
    user_id: Optional[uuid.UUID] = None,
    opportunity_id: Optional[uuid.UUID] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    page: int = 1,
    page_size: int = 15,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_superadmin),
):
    """
    Granular prompt & query audit log for Superadmin.
    Inspect full prompt query submitted by users to the AI Assistant.
    """
    from datetime import date
    from app.services.ai_usage_service import get_assistant_queries_audit

    d_from = date.fromisoformat(date_from) if date_from else None
    d_to = date.fromisoformat(date_to) if date_to else None

    return get_assistant_queries_audit(
        db=db,
        user_id=user_id,
        opportunity_id=opportunity_id,
        search=search,
        date_from=d_from,
        date_to=d_to,
        page=page,
        page_size=page_size,
    )


# =========================================================================
# Master Solutions Catalog Endpoints
# =========================================================================

@router.get("/solutions", response_model=MasterSolutionListResponse)
def list_master_solutions(
    pillar: Optional[str] = None,
    tier: Optional[int] = None,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """List all master solutions with filtering."""
    query = db.query(MasterSolution)

    if pillar and pillar.lower() != "all":
        query = query.filter(MasterSolution.pillar.ilike(f"%{pillar.strip()}%"))
    if tier is not None:
        query = query.filter(MasterSolution.tier == tier)
    if is_active is not None:
        query = query.filter(MasterSolution.is_active == is_active)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                MasterSolution.title.ilike(s),
                MasterSolution.business_impact.ilike(s),
                MasterSolution.summary_snippet.ilike(s),
            )
        )

    total = query.count()
    items = query.order_by(MasterSolution.tier.asc(), MasterSolution.title.asc()).all()

    # Get distinct pillars
    raw_pillars = [p[0] for p in db.query(MasterSolution.pillar).distinct().all() if p[0]]
    pillars = raw_pillars if raw_pillars else [
        "Cloud Infrastructure & Modernization",
        "Data Analytics & AI",
        "Cybersecurity Suite",
        "Network & Enterprise Workplace",
    ]

    return {
        "items": items,
        "total": total,
        "pillars": pillars,
    }


@router.post("/solutions", response_model=MasterSolutionResponse, status_code=status.HTTP_201_CREATED)
def create_master_solution(
    payload: MasterSolutionCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_superadmin),
):
    """Create a new solution card in the master catalog."""
    new_solution = MasterSolution(
        title=payload.title.strip(),
        slug=payload.slug or payload.title.lower().replace(" ", "-")[:100],
        pillar=payload.pillar.strip(),
        tier=payload.tier,
        primary_products=payload.primary_products or [],
        all_products=payload.all_products or [],
        target_industries=payload.target_industries or ["Enterprise General"],
        key_subheadings=payload.key_subheadings or [],
        pain_points=payload.pain_points or [],
        business_impact=payload.business_impact,
        summary_snippet=payload.summary_snippet,
        source_url=payload.source_url,
        is_active=payload.is_active,
    )
    db.add(new_solution)
    db.commit()
    db.refresh(new_solution)

    try:
        solutions_catalog.reload()
    except Exception:
        pass

    return new_solution


@router.put("/solutions/{solution_id}", response_model=MasterSolutionResponse)
def update_master_solution(
    solution_id: uuid.UUID,
    payload: MasterSolutionUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_superadmin),
):
    """Update an existing solution card."""
    solution = db.query(MasterSolution).filter(MasterSolution.id == solution_id).first()
    if not solution:
        raise HTTPException(status_code=404, detail="Solution not found")

    update_data = payload.dict(exclude_unset=True)
    for field, val in update_data.items():
        setattr(solution, field, val)

    db.commit()
    db.refresh(solution)

    try:
        solutions_catalog.reload()
    except Exception:
        pass

    return solution


@router.delete("/solutions/{solution_id}", status_code=status.HTTP_200_OK)
def delete_master_solution(
    solution_id: uuid.UUID,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_superadmin),
):
    """Delete a solution card from the master catalog."""
    solution = db.query(MasterSolution).filter(MasterSolution.id == solution_id).first()
    if not solution:
        raise HTTPException(status_code=404, detail="Solution not found")

    db.delete(solution)
    db.commit()

    try:
        solutions_catalog.reload()
    except Exception:
        pass

    return {"status": "success", "message": f"Solution '{solution.title}' deleted"}



