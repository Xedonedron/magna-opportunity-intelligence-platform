"""
Audit Service for logging all system changes.

Provides a centralized way to record audit events.
"""

import uuid
import logging
from typing import Any, Optional
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog

logger = logging.getLogger(__name__)


class AuditService:
    """Service for recording audit log entries."""

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
        Create an audit log entry.

        Args:
            action: The action performed (create, update, delete, status_change, etc.)
            entity_type: The type of entity (Opportunity, KYCReport, Meeting, etc.)
            entity_id: The UUID of the entity
            user_id: The UUID of the user performing the action
            old_value: Snapshot of entity before change
            new_value: Snapshot of entity after change
            ip_address: Client IP address
            user_agent: Client user agent string
            extra_data: Additional context

        Returns:
            The created AuditLog entry
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
        # Note: Caller should commit as part of their transaction
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
        return self.log(
            action="opportunity_create",
            entity_type="Opportunity",
            entity_id=opportunity_id,
            user_id=user_id,
            new_value=opportunity_data,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    def log_opportunity_update(
        self,
        opportunity_id: uuid.UUID,
        user_id: uuid.UUID,
        old_value: dict[str, Any],
        new_value: dict[str, Any],
        changed_fields: list[str],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        """Log opportunity update."""
        return self.log(
            action="opportunity_update",
            entity_type="Opportunity",
            entity_id=opportunity_id,
            user_id=user_id,
            old_value=old_value,
            new_value=new_value,
            ip_address=ip_address,
            user_agent=user_agent,
            extra_data={"changed_fields": changed_fields},
        )

    def log_status_change(
        self,
        opportunity_id: uuid.UUID,
        user_id: uuid.UUID,
        old_status: str,
        new_status: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        """Log opportunity status change."""
        return self.log(
            action="status_change",
            entity_type="Opportunity",
            entity_id=opportunity_id,
            user_id=user_id,
            old_value={"status": old_status},
            new_value={"status": new_status},
            ip_address=ip_address,
            user_agent=user_agent,
        )

    def log_kyc_create(
        self,
        kyc_report_id: uuid.UUID,
        opportunity_id: uuid.UUID,
        user_id: Optional[uuid.UUID],
        version: int,
        source_type: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        """Log KYC report creation."""
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
        )

    def log_kyc_edit(
        self,
        kyc_report_id: uuid.UUID,
        user_id: uuid.UUID,
        old_value: dict[str, Any],
        new_value: dict[str, Any],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        """Log KYC report edit."""
        return self.log(
            action="kyc_edit",
            entity_type="KYCReport",
            entity_id=kyc_report_id,
            user_id=user_id,
            old_value=old_value,
            new_value=new_value,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    def log_meeting_create(
        self,
        meeting_id: uuid.UUID,
        opportunity_id: uuid.UUID,
        user_id: uuid.UUID,
        meeting_data: dict[str, Any],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        """Log meeting creation."""
        return self.log(
            action="meeting_create",
            entity_type="Meeting",
            entity_id=meeting_id,
            user_id=user_id,
            new_value={"opportunity_id": str(opportunity_id), **meeting_data},
            ip_address=ip_address,
            user_agent=user_agent,
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