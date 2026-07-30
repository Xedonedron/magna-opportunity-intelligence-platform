"""
Email Notification Service

Sends email notifications via Gmail API or SMTP fallback.
For MVP, we use a simple SMTP approach. In production, this should
be replaced with Gmail API for Google Workspace integration.
"""

import logging
from typing import Optional

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class EmailService:
    """Service for sending email notifications."""

    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM_EMAIL

    def send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
        html_body: Optional[str] = None,
    ) -> bool:
        """
        Send an email notification.

        For MVP, this logs the email instead of actually sending it.
        Replace with actual SMTP/Gmail API implementation in production.
        """
        logger.info(
            f"[EMAIL] To: {to_email} | Subject: {subject} | Body: {body[:200]}..."
        )

        # TODO: Implement actual email sending via Gmail API
        # from googleapiclient.discovery import build
        # service = build('gmail', 'v1', credentials=creds)
        # ...

        return True

    def send_opportunity_created_email(
        self, to_email: str, company_name: str, opportunity_id: str
    ) -> bool:
        """Send notification when a new opportunity is created."""
        subject = f"[MOIP] New Opportunity: {company_name}"
        body = (
            f"A new opportunity has been created for {company_name}.\n\n"
            f"Opportunity ID: {opportunity_id}\n"
            f"The AI KYC pipeline will start automatically.\n\n"
            f"View details: {settings.FRONTEND_URL}/opportunities/{opportunity_id}"
        )
        return self.send_email(to_email, subject, body)

    def send_kyc_completed_email(
        self, to_email: str, company_name: str, opportunity_id: str
    ) -> bool:
        """Send notification when KYC is completed."""
        subject = f"[MOIP] KYC Completed: {company_name}"
        body = (
            f"The AI KYC report for {company_name} has been generated.\n\n"
            f"Opportunity ID: {opportunity_id}\n\n"
            f"View report: {settings.FRONTEND_URL}/opportunities/{opportunity_id}"
        )
        return self.send_email(to_email, subject, body)

    def send_meeting_reminder_email(
        self,
        to_email: str,
        company_name: str,
        meeting_title: str,
        meeting_date: str,
    ) -> bool:
        """Send meeting reminder (H-1 and H-30 minutes)."""
        subject = f"[MOIP] Meeting Reminder: {meeting_title}"
        body = (
            f"Reminder: {meeting_title} with {company_name}\n\n"
            f"Date: {meeting_date}\n\n"
            f"Please review the KYC report before the meeting."
        )
        return self.send_email(to_email, subject, body)

    def send_status_changed_email(
        self,
        to_email: str,
        company_name: str,
        old_status: str,
        new_status: str,
    ) -> bool:
        """Send notification when opportunity status changes."""
        subject = f"[MOIP] Status Changed: {company_name}"
        body = (
            f"Opportunity status for {company_name} has changed.\n\n"
            f"From: {old_status}\n"
            f"To: {new_status}"
        )
        return self.send_email(to_email, subject, body)


# Singleton instance
email_service = EmailService()