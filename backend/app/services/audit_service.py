"""
Audit Service for logging all system changes.

Provides a centralized way to record audit events and user activity telemetry.
"""

import uuid
import logging
from typing import Any, Optional
from datetime import datetime, timezone, timedelta

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.audit_log import AuditLog
from app.models.user import User

logger = logging.getLogger(__name__)


def format_action_narrative(log: AuditLog) -> tuple[str, str]:
    """
    Generate human-readable action label and descriptive narrative.
    Returns (label, narrative_description).
    """
    action = log.action or ""
    entity_type = log.entity_type or ""
    extra = log.extra_data or {}
    old = log.old_value or {}
    new = log.new_value or {}

    company_name = (
        extra.get("company_name")
        or new.get("company_name")
        or old.get("company_name")
        or ""
    )
    meeting_title = (
        extra.get("title")
        or new.get("title")
        or old.get("title")
        or ""
    )
    doc_title = (
        extra.get("document_title")
        or new.get("title")
        or old.get("title")
        or ""
    )

    if action == "opportunity_create":
        target = f" '{company_name}'" if company_name else ""
        return ("Peluang Dibuat", f"Membuat peluang (opportunity) baru{target}")

    if action == "opportunity_update":
        target = f" '{company_name}'" if company_name else ""
        changed = extra.get("changed_fields")
        if changed and isinstance(changed, list):
            fields_str = ", ".join(changed[:3])
            if len(changed) > 3:
                fields_str += f" (+{len(changed)-3} lainnya)"
            return ("Peluang Diperbarui", f"Memperbarui data {fields_str} pada peluang{target}")
        return ("Peluang Diperbarui", f"Memperbarui detail peluang{target}")

    if action == "status_change":
        target = f" '{company_name}'" if company_name else ""
        old_st = old.get("status", "-")
        new_st = new.get("status", "-")
        return ("Status Diubah", f"Mengubah status peluang{target} dari '{old_st}' ke '{new_st}'")

    if action == "opportunity_delete":
        target = f" '{company_name}'" if company_name else ""
        return ("Peluang Dihapus", f"Menghapus data peluang{target}")

    if action == "document_upload":
        target = f" '{doc_title}'" if doc_title else ""
        opp_str = f" untuk peluang '{company_name}'" if company_name else ""
        return ("Dokumen Diunggah", f"Mengunggah dokumen pendukung{target}{opp_str}")

    if action == "document_delete":
        target = f" '{doc_title}'" if doc_title else ""
        return ("Dokumen Dihapus", f"Menghapus dokumen pendukung{target}")

    if action == "meeting_create":
        target = f" '{meeting_title}'" if meeting_title else ""
        opp_str = f" ({company_name})" if company_name else ""
        return ("Rapat Dijadwalkan", f"Menjadwalkan agenda rapat baru{target}{opp_str}")

    if action == "meeting_update":
        target = f" '{meeting_title}'" if meeting_title else ""
        return ("Rapat Diperbarui", f"Memperbarui detail agenda rapat{target}")

    if action == "meeting_delete":
        target = f" '{meeting_title}'" if meeting_title else ""
        return ("Rapat Dihapus", f"Menghapus agenda rapat{target}")

    if action in ("kyc_create", "kyc_regenerate"):
        target = f" untuk '{company_name}'" if company_name else ""
        return ("KYC Digenerate", f"Menjalankan AI pipeline riset KYC{target}")

    if action == "kyc_edit":
        target = f" '{company_name}'" if company_name else ""
        return ("KYC Diedit", f"Melakukan penyesuaian/edit pada laporan KYC{target}")

    if action == "persona_generate":
        seniority = extra.get("seniority", "")
        dept = extra.get("department", "")
        spec = f" ({seniority} - {dept})" if seniority or dept else ""
        target = f" untuk '{company_name}'" if company_name else ""
        return ("Persona Digenerate", f"Men-generate Target Persona Playbook{spec}{target}")

    if action == "opportunity_chat":
        target = f" '{company_name}'" if company_name else ""
        return ("Tanya AI Assistant", f"Menggunakan AI Assistant RAG untuk berdiskusi tentang peluang{target}")

    if action == "user_login":
        return ("Login Sesi", "Masuk (login) ke platform MOIP")

    if action == "user_access_update":
        target_email = extra.get("target_email", "")
        target_str = f" ({target_email})" if target_email else ""
        return ("Akses User Diubah", f"Mengubah role atau kapabilitas user{target_str}")

    if action == "master_data_update":
        return ("Master Data Diubah", "Memperbarui opsi master data (Pre-sales / Industri)")

    if action == "system_settings_update":
        return ("Pengaturan AI Diubah", "Memperbarui konfigurasi sistem atau model AI")

    # Generic fallback
    readable_action = action.replace("_", " ").title()
    return (readable_action, f"{readable_action} pada {entity_type}")


class AuditService:
    """Service for recording audit log entries and tracking user telemetry."""

    def __init__(self, db: Session):
        self.db = db

    def log(
        self,
        action: str,
        entity_type: str,
        entity_id: uuid.UUID,
        user_id: Optional[uuid.UUID] = None,
        old_value: Optional[dict[str, Any]] = None,
        new_value: Optional[dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        extra_data: Optional[dict[str, Any]] = None,
    ) -> AuditLog:
        """
        Create an audit log entry and touch user's last_active_at.
        """
        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_value=old_value,
            new_value=new_value,
            ip_address=ip_address,
            user_agent=user_agent,
            extra_data=extra_data,
        )
        self.db.add(audit_log)

        # Update user's last_active_at timestamp automatically
        if user_id:
            now = datetime.now(timezone.utc)
            try:
                self.db.query(User).filter(User.id == user_id).update(
                    {"last_active_at": now}, synchronize_session=False
                )
            except Exception as e:
                logger.warning(f"Failed to touch user {user_id} last_active_at: {e}")

        return audit_log

    def log_opportunity_create(
        self,
        opportunity_id: uuid.UUID,
        user_id: uuid.UUID,
        opportunity_data: dict[str, Any],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        """Log opportunity creation."""
        company_name = opportunity_data.get("company_name")
        return self.log(
            action="opportunity_create",
            entity_type="Opportunity",
            entity_id=opportunity_id,
            user_id=user_id,
            new_value=opportunity_data,
            ip_address=ip_address,
            user_agent=user_agent,
            extra_data={"company_name": company_name} if company_name else None,
        )

    def log_opportunity_update(
        self,
        opportunity_id: uuid.UUID,
        user_id: uuid.UUID,
        old_value: dict[str, Any],
        new_value: dict[str, Any],
        changed_fields: list[str],
        company_name: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        """Log opportunity update."""
        extra = {"changed_fields": changed_fields}
        if company_name:
            extra["company_name"] = company_name
        return self.log(
            action="opportunity_update",
            entity_type="Opportunity",
            entity_id=opportunity_id,
            user_id=user_id,
            old_value=old_value,
            new_value=new_value,
            ip_address=ip_address,
            user_agent=user_agent,
            extra_data=extra,
        )

    def log_status_change(
        self,
        opportunity_id: uuid.UUID,
        user_id: uuid.UUID,
        old_status: str,
        new_status: str,
        company_name: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        """Log opportunity status change."""
        extra = {}
        if company_name:
            extra["company_name"] = company_name
        return self.log(
            action="status_change",
            entity_type="Opportunity",
            entity_id=opportunity_id,
            user_id=user_id,
            old_value={"status": old_status},
            new_value={"status": new_status},
            ip_address=ip_address,
            user_agent=user_agent,
            extra_data=extra or None,
        )

    def log_kyc_create(
        self,
        kyc_report_id: uuid.UUID,
        opportunity_id: uuid.UUID,
        user_id: Optional[uuid.UUID],
        version: int,
        source_type: str,
        company_name: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        """Log KYC report creation."""
        extra = {}
        if company_name:
            extra["company_name"] = company_name
        return self.log(
            action="kyc_create",
            entity_type="KYCReport",
            entity_id=kyc_report_id,
            user_id=user_id,
            new_value={
                "opportunity_id": str(opportunity_id),
                "version": version,
                "source_type": source_type,
            },
            ip_address=ip_address,
            user_agent=user_agent,
            extra_data=extra or None,
        )

    def log_kyc_edit(
        self,
        kyc_report_id: uuid.UUID,
        user_id: uuid.UUID,
        old_value: dict[str, Any],
        new_value: dict[str, Any],
        company_name: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        """Log KYC report edit."""
        extra = {}
        if company_name:
            extra["company_name"] = company_name
        return self.log(
            action="kyc_edit",
            entity_type="KYCReport",
            entity_id=kyc_report_id,
            user_id=user_id,
            old_value=old_value,
            new_value=new_value,
            ip_address=ip_address,
            user_agent=user_agent,
            extra_data=extra or None,
        )

    def log_meeting_create(
        self,
        meeting_id: uuid.UUID,
        opportunity_id: uuid.UUID,
        user_id: uuid.UUID,
        meeting_data: dict[str, Any],
        company_name: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        """Log meeting creation."""
        extra = {}
        if company_name:
            extra["company_name"] = company_name
        if "title" in meeting_data:
            extra["title"] = meeting_data["title"]
        return self.log(
            action="meeting_create",
            entity_type="Meeting",
            entity_id=meeting_id,
            user_id=user_id,
            new_value={"opportunity_id": str(opportunity_id), **meeting_data},
            ip_address=ip_address,
            user_agent=user_agent,
            extra_data=extra or None,
        )

    def log_user_login(
        self,
        user_id: uuid.UUID,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        """Log user login."""
        return self.log(
            action="user_login",
            entity_type="User",
            entity_id=user_id,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    def get_user_activity_summary(self, user_id: uuid.UUID) -> dict[str, Any]:
        """
        Get aggregated activity summary metrics for a specific user:
        - days_active_this_month: distinct days with logged actions in current calendar month
        - actions_count_this_month: total actions in current calendar month
        - total_actions_all_time: total actions logged across all time
        - last_action: detailed info about the single latest action
        """
        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Count distinct days active this month
        days_active = (
            self.db.query(func.count(func.distinct(func.date(AuditLog.created_at))))
            .filter(AuditLog.user_id == user_id, AuditLog.created_at >= month_start)
            .scalar()
            or 0
        )

        # Count total actions this month
        actions_month = (
            self.db.query(func.count(AuditLog.id))
            .filter(AuditLog.user_id == user_id, AuditLog.created_at >= month_start)
            .scalar()
            or 0
        )

        # Total actions all time
        total_actions = (
            self.db.query(func.count(AuditLog.id))
            .filter(AuditLog.user_id == user_id)
            .scalar()
            or 0
        )

        # Latest action
        last_log = (
            self.db.query(AuditLog)
            .filter(AuditLog.user_id == user_id)
            .order_by(AuditLog.created_at.desc())
            .first()
        )

        last_action_data = None
        if last_log:
            label, narrative = format_action_narrative(last_log)
            last_action_data = {
                "id": str(last_log.id),
                "action": last_log.action,
                "action_label": label,
                "description": narrative,
                "entity_type": last_log.entity_type,
                "entity_id": str(last_log.entity_id),
                "created_at": last_log.created_at.isoformat(),
            }

        return {
            "days_active_this_month": int(days_active),
            "actions_count_this_month": int(actions_month),
            "total_actions_all_time": int(total_actions),
            "last_action": last_action_data,
        }

    def get_user_detailed_activities(
        self,
        user_id: uuid.UUID,
        page: int = 1,
        page_size: int = 20,
        category: Optional[str] = None,
        range_filter: Optional[str] = None,
    ) -> dict[str, Any]:
        """
        Query paginated audit logs for a user with category and date range filters.
        """
        query = self.db.query(AuditLog).filter(AuditLog.user_id == user_id)

        now = datetime.now(timezone.utc)

        # Filter by time range
        if range_filter == "today":
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            query = query.filter(AuditLog.created_at >= today_start)
        elif range_filter == "7d":
            seven_days_ago = now - timedelta(days=7)
            query = query.filter(AuditLog.created_at >= seven_days_ago)
        elif range_filter == "30d" or range_filter == "month":
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            query = query.filter(AuditLog.created_at >= month_start)

        # Filter by category
        if category and category != "all":
            if category == "opportunities":
                query = query.filter(
                    AuditLog.entity_type.in_(["Opportunity", "OpportunityDocument"])
                )
            elif category == "meetings":
                query = query.filter(AuditLog.entity_type == "Meeting")
            elif category == "kyc":
                query = query.filter(
                    AuditLog.entity_type.in_(["KYCReport", "OpportunityPersona"])
                )
            elif category == "auth":
                query = query.filter(AuditLog.action.in_(["user_login", "login"]))
            elif category == "admin":
                query = query.filter(
                    AuditLog.action.in_(
                        ["user_access_update", "master_data_update", "system_settings_update"]
                    )
                )

        total = query.count()
        offset = (page - 1) * page_size
        items = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(page_size).all()

        formatted_items = []
        for log in items:
            label, narrative = format_action_narrative(log)
            formatted_items.append({
                "id": str(log.id),
                "action": log.action,
                "action_label": label,
                "description": narrative,
                "entity_type": log.entity_type,
                "entity_id": str(log.entity_id),
                "old_value": log.old_value,
                "new_value": log.new_value,
                "extra_data": log.extra_data,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "created_at": log.created_at.isoformat(),
            })

        return {
            "items": formatted_items,
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    def get_entity_history(
        self,
        entity_type: str,
        entity_id: uuid.UUID,
        limit: int = 50,
    ) -> list[AuditLog]:
        """Get audit history for an entity."""
        return (
            self.db.query(AuditLog)
            .filter(AuditLog.entity_type == entity_type)
            .filter(AuditLog.entity_id == entity_id)
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
            .all()
        )

    def get_user_activity(
        self,
        user_id: uuid.UUID,
        limit: int = 50,
    ) -> list[AuditLog]:
        """Get recent activity for a user."""
        return (
            self.db.query(AuditLog)
            .filter(AuditLog.user_id == user_id)
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
            .all()
        )