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
from app.api.auth import get_current_user

router = APIRouter(prefix="/api/admin", tags=["admin"])

def require_superadmin(current_user: User = Depends(get_current_user)):
    if current_user.role != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hanya superadmin yang memiliki akses ke halaman operasional ini."
        )
    return current_user

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
    ],
    "presales": [
        "Devi",
        "Robi",
        "Gerry",
    ],
}


class MasterDataPayload(BaseModel):
    industries: list[str]
    presales: list[str]


@router.get("/master-data")
def get_master_data():
    """Retrieve master data options (Industries & Pre-Sales)."""
    return MASTER_DATA


@router.post("/master-data")
def update_master_data(
    payload: MasterDataPayload,
    _admin: User = Depends(require_superadmin)
):
    """Update master data options (Super Admin only)."""
    MASTER_DATA["industries"] = [i.strip() for i in payload.industries if i.strip()]
    MASTER_DATA["presales"] = [p.strip() for p in payload.presales if p.strip()]
    return {"status": "success", "master_data": MASTER_DATA}


