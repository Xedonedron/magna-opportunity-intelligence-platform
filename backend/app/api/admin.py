from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
import uuid

from app.core.database import get_db
from app.models.user import User
from app.models.audit_log import AuditLog
from app.models.opportunity import Opportunity
from app.models.meeting import Meeting
from app.models.kyc_report import KYCReport
from app.core.security import get_current_user, require_superadmin

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
    """Retrieve all users in the system (Super Admin only)."""
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        {
            "id": str(u.id),
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "is_active": u.is_active,
            "capabilities": u.capabilities,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_login": u.last_login.isoformat() if u.last_login else None,
        }
        for u in users
    ]


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

    user.role = payload.role
    user.capabilities = payload.capabilities
    if payload.is_active is not None:
        user.is_active = payload.is_active
        
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
    _admin: User = Depends(require_superadmin)
):
    """Update master data options (Super Admin only)."""
    MASTER_DATA["industries"] = [i.strip() for i in payload.industries if i.strip()]
    MASTER_DATA["presales"] = [p.strip() for p in payload.presales if p.strip()]
    if payload.document_labels is not None:
        MASTER_DATA["document_labels"] = [l.strip() for l in payload.document_labels if l.strip()]
    return {"status": "success", "master_data": MASTER_DATA}


# System & AI Settings Configuration
class SystemSettingsPayload(BaseModel):
    llm_provider: str  # "google" | "openai"
    ai_model: str
    temperature: float = 0.0
    search_depth: str = "advanced"
    max_results: int = 5
    hide_financial_numbers: Optional[bool] = False
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    openai_api_base: Optional[str] = None


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


@router.get("/settings")
def get_system_settings_api(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user)
):
    """Get system and AI pipeline configuration settings."""
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

    return {
        "llm_provider": kv.get("llm_provider") or settings.LLM_PROVIDER,
        "ai_model": kv.get("ai_model") or settings.OPENAI_MODEL,
        "temperature": float(kv.get("temperature", 0.0)),
        "search_depth": kv.get("search_depth", "advanced"),
        "max_results": int(kv.get("max_results", 5)),
        "hide_financial_numbers": kv.get("hide_financial_numbers", "false").lower() == "true",
        "has_gemini_key": bool(gemini_key),
        "masked_gemini_key": mask_key(gemini_key),
        "has_openai_key": bool(openai_key),
        "masked_openai_key": mask_key(openai_key),
        "openai_api_base": kv.get("openai_api_base") or settings.OPENAI_API_BASE,
    }


@router.patch("/settings")
def update_system_settings_api(
    payload: SystemSettingsPayload,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_superadmin)
):
    """Update AI system configuration and API keys (Superadmin only)."""
    from app.models.system_setting import SystemSetting

    updates = {
        "llm_provider": payload.llm_provider,
        "ai_model": payload.ai_model,
        "temperature": str(payload.temperature),
        "search_depth": payload.search_depth,
        "max_results": str(payload.max_results),
    }

    if payload.hide_financial_numbers is not None:
        updates["hide_financial_numbers"] = "true" if payload.hide_financial_numbers else "false"

    if payload.gemini_api_key is not None and not payload.gemini_api_key.startswith("****"):
        updates["gemini_api_key"] = payload.gemini_api_key.strip()

    if payload.openai_api_key is not None and not payload.openai_api_key.startswith("****"):
        updates["openai_api_key"] = payload.openai_api_key.strip()

    if payload.openai_api_base is not None:
        updates["openai_api_base"] = payload.openai_api_base.strip()

    for k, v in updates.items():
        row = db.query(SystemSetting).filter(SystemSetting.key == k).first()
        if not row:
            row = SystemSetting(key=k, value=v)
            db.add(row)
        else:
            row.value = v

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

        return {
            "status": "success",
            "message": f"Connection successful! Provider '{payload.provider}' responded: '{content.strip()}'",
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Connection failed: {str(e)}",
        }



