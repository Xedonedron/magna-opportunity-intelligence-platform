"""
Centralized Notification Service for MOIP.

Handles notification creation, recipient routing (Creator, Assigned Engineer, Superadmins),
self-actor exclusion, and deep-linking to specific tabs.
"""

from __future__ import annotations

import json
import logging
import uuid
from typing import Optional, List
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.opportunity import Opportunity
from app.models.user import User

logger = logging.getLogger(__name__)


def _format_currency(amount: Optional[float | int]) -> str:
    if amount is None:
        return "Rp 0"
    try:
        val = int(amount)
        formatted = f"{val:,}".replace(",", ".")
        return f"Rp {formatted}"
    except (ValueError, TypeError):
        return str(amount)


class NotificationService:
    """Service to create and dispatch in-app notifications with targeted audience routing."""

    @staticmethod
    def resolve_recipients(
        db: Session,
        opportunity: Opportunity,
        actor_id: Optional[uuid.UUID] = None,
    ) -> List[User]:
        """
        Determine users who should receive notifications for an opportunity:
        1. Opportunity Creator (Sales Owner)
        2. Assigned Pre-Sales Engineer (if assigned and user account exists)
        3. All Superadmins (per system policy)
        EXCLUDING the actor who initiated the change (to avoid self-spam).
        """
        recipients_map: dict[uuid.UUID, User] = {}

        # 1. Creator
        if opportunity.created_by:
            creator = (
                db.query(User)
                .filter(User.id == opportunity.created_by, User.is_active == True)
                .first()
            )
            if creator:
                recipients_map[creator.id] = creator

        # 2. Assigned Engineer
        if opportunity.assigned_engineer:
            eng_name = opportunity.assigned_engineer.strip()
            engineer = (
                db.query(User)
                .filter(
                    User.is_active == True,
                    (
                        User.full_name.ilike(f"%{eng_name}%")
                        | (User.email.ilike(f"{eng_name}%"))
                    ),
                )
                .first()
            )
            if engineer:
                recipients_map[engineer.id] = engineer

        # 3. Superadmins (all active superadmins get notified)
        superadmins = (
            db.query(User)
            .filter(User.role == "superadmin", User.is_active == True)
            .all()
        )
        for sa in superadmins:
            recipients_map[sa.id] = sa

        # Exclude self-actor so the actor is not spammed with their own action
        if actor_id and actor_id in recipients_map:
            del recipients_map[actor_id]

        return list(recipients_map.values())

    @staticmethod
    def create_notifications_for_recipients(
        db: Session,
        opportunity: Opportunity,
        recipients: List[User],
        notif_type: str,
        title: str,
        message: str,
        link_url: Optional[str] = None,
        metadata_dict: Optional[dict] = None,
    ) -> List[Notification]:
        """Persist notifications for all resolved recipients."""
        created_notifs: List[Notification] = []
        meta_str = json.dumps(metadata_dict) if metadata_dict else None

        for user in recipients:
            notif = Notification(
                id=uuid.uuid4(),
                user_id=user.id,
                opportunity_id=opportunity.id,
                type=notif_type,
                title=title,
                message=message,
                link_url=link_url,
                metadata_json=meta_str,
            )
            db.add(notif)
            created_notifs.append(notif)

        if created_notifs:
            try:
                db.flush()
            except Exception as e:
                logger.error(f"Failed to flush notifications: {e}")

        return created_notifs

    @classmethod
    def notify_kyc_completed(
        cls,
        db: Session,
        opportunity: Opportunity,
        version: int = 1,
        actor_id: Optional[uuid.UUID] = None,
    ) -> List[Notification]:
        """Triggered when AI KYC pipeline finishes successfully."""
        recipients = cls.resolve_recipients(db, opportunity, actor_id=actor_id)
        title = f"KYC Report Completed (v{version})"
        message = f"AI KYC report for {opportunity.company_name} is ready."
        link_url = f"/opportunities/{opportunity.id}?tab=kyc"

        return cls.create_notifications_for_recipients(
            db=db,
            opportunity=opportunity,
            recipients=recipients,
            notif_type="kyc_completed",
            title=title,
            message=message,
            link_url=link_url,
            metadata_dict={"version": version, "status": "completed"},
        )

    @classmethod
    def notify_kyc_failed(
        cls,
        db: Session,
        opportunity: Opportunity,
        error_message: str,
        version: int = 1,
        actor_id: Optional[uuid.UUID] = None,
    ) -> List[Notification]:
        """Triggered when AI KYC pipeline fails."""
        recipients = cls.resolve_recipients(db, opportunity, actor_id=actor_id)
        title = f"KYC Report Failed (v{version})"
        clean_err = str(error_message).strip() if error_message else "Unknown error"
        short_err = (clean_err[:120] + "...") if len(clean_err) > 120 else clean_err
        message = f"AI KYC generation for {opportunity.company_name} failed: {short_err}"
        link_url = f"/opportunities/{opportunity.id}?tab=kyc"

        return cls.create_notifications_for_recipients(
            db=db,
            opportunity=opportunity,
            recipients=recipients,
            notif_type="kyc_failed",
            title=title,
            message=message,
            link_url=link_url,
            metadata_dict={"version": version, "status": "failed", "error": clean_err},
        )

    @classmethod
    def notify_status_changed(
        cls,
        db: Session,
        opportunity: Opportunity,
        old_status: str,
        new_status: str,
        actor_id: Optional[uuid.UUID] = None,
    ) -> List[Notification]:
        """Triggered when opportunity status changes."""
        recipients = cls.resolve_recipients(db, opportunity, actor_id=actor_id)
        title = f"Status Changed: {opportunity.company_name}"
        message = f"Status changed from '{old_status}' to '{new_status}'."
        link_url = f"/opportunities/{opportunity.id}?tab=overview"

        return cls.create_notifications_for_recipients(
            db=db,
            opportunity=opportunity,
            recipients=recipients,
            notif_type="status_changed",
            title=title,
            message=message,
            link_url=link_url,
            metadata_dict={"old_status": old_status, "new_status": new_status},
        )

    @classmethod
    def notify_revenue_changed(
        cls,
        db: Session,
        opportunity: Opportunity,
        old_val: Optional[float | int],
        new_val: Optional[float | int],
        actor_id: Optional[uuid.UUID] = None,
    ) -> List[Notification]:
        """Triggered when potential revenue / deal value changes."""
        recipients = cls.resolve_recipients(db, opportunity, actor_id=actor_id)
        old_formatted = _format_currency(old_val)
        new_formatted = _format_currency(new_val)
        title = f"Deal Value Updated: {opportunity.company_name}"
        message = f"Potential revenue updated from {old_formatted} to {new_formatted}."
        link_url = f"/opportunities/{opportunity.id}?tab=overview"

        return cls.create_notifications_for_recipients(
            db=db,
            opportunity=opportunity,
            recipients=recipients,
            notif_type="deal_value_changed",
            title=title,
            message=message,
            link_url=link_url,
            metadata_dict={
                "old_revenue": float(old_val) if old_val is not None else None,
                "new_revenue": float(new_val) if new_val is not None else None,
            },
        )

    @classmethod
    def notify_engineer_assigned(
        cls,
        db: Session,
        opportunity: Opportunity,
        assigned_engineer: str,
        actor_id: Optional[uuid.UUID] = None,
    ) -> List[Notification]:
        """Triggered when a pre-sales engineer is assigned or reassigned."""
        recipients = cls.resolve_recipients(db, opportunity, actor_id=actor_id)
        title = f"Pre-Sales Assigned: {opportunity.company_name}"
        message = f"{assigned_engineer} has been assigned to pre-sales opportunity '{opportunity.company_name}'."
        link_url = f"/opportunities/{opportunity.id}?tab=overview"

        return cls.create_notifications_for_recipients(
            db=db,
            opportunity=opportunity,
            recipients=recipients,
            notif_type="opportunity_assigned",
            title=title,
            message=message,
            link_url=link_url,
            metadata_dict={"assigned_engineer": assigned_engineer},
        )

    @classmethod
    def notify_meeting_scheduled(
        cls,
        db: Session,
        opportunity: Opportunity,
        meeting_title: str,
        meeting_date_str: str,
        actor_id: Optional[uuid.UUID] = None,
    ) -> List[Notification]:
        """Triggered when a meeting is scheduled."""
        recipients = cls.resolve_recipients(db, opportunity, actor_id=actor_id)
        title = f"Meeting Scheduled: {opportunity.company_name}"
        message = f"New meeting '{meeting_title}' scheduled for {meeting_date_str}."
        link_url = f"/opportunities/{opportunity.id}?tab=meetings"

        return cls.create_notifications_for_recipients(
            db=db,
            opportunity=opportunity,
            recipients=recipients,
            notif_type="meeting_scheduled",
            title=title,
            message=message,
            link_url=link_url,
            metadata_dict={"meeting_title": meeting_title, "meeting_date": meeting_date_str},
        )

    @classmethod
    def notify_opportunity_created(
        cls,
        db: Session,
        opportunity: Opportunity,
        actor_id: Optional[uuid.UUID] = None,
    ) -> List[Notification]:
        """Triggered when a new opportunity is created."""
        recipients = cls.resolve_recipients(db, opportunity, actor_id=actor_id)
        title = f"Opportunity Created: {opportunity.company_name}"
        message = f"Opportunity for {opportunity.company_name} has been created."
        link_url = f"/opportunities/{opportunity.id}?tab=overview"

        return cls.create_notifications_for_recipients(
            db=db,
            opportunity=opportunity,
            recipients=recipients,
            notif_type="opportunity_created",
            title=title,
            message=message,
            link_url=link_url,
            metadata_dict={"company_name": opportunity.company_name},
        )
