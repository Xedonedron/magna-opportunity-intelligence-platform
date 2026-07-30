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
