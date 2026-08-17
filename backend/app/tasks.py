"""
Celery tasks for notification processing.

Handles async email sending and calendar event creation.
"""

import logging
from datetime import datetime, timedelta

from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.notification import Notification
from app.models.opportunity import Opportunity
from app.models.user import User
from app.services.email_service import email_service
from app.services.calendar_service import calendar_service

logger = logging.getLogger(__name__)


@celery_app.task(name="tasks.send_opportunity_created_notification")
def send_opportunity_created_notification(opportunity_id: str) -> dict:
    """Send notification when a new opportunity is created."""
    db = SessionLocal()
    try:
        opportunity = db.query(Opportunity).filter(
            Opportunity.id == opportunity_id
        ).first()
        if not opportunity:
            return {"status": "error", "message": "Opportunity not found"}

        # Create in-app notification for the creator
        notification = Notification(
            user_id=opportunity.created_by,
            opportunity_id=opportunity.id,
            type="opportunity_created",
            title="Opportunity Created",
            message=f"Opportunity for {opportunity.company_name} has been created.",
        )
        db.add(notification)

        # Send email to creator
        creator = db.query(User).filter(User.id == opportunity.created_by).first()
        if creator:
            email_service.send_opportunity_created_email(
                to_email=creator.email,
                company_name=opportunity.company_name,
                opportunity_id=str(opportunity.id),
            )

        db.commit()
        return {"status": "success", "notification_id": str(notification.id)}
    except Exception as e:
        db.rollback()
        logger.error(f"Error sending opportunity created notification: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        db.close()


@celery_app.task(name="tasks.send_kyc_completed_notification")
def send_kyc_completed_notification(opportunity_id: str) -> dict:
    """Send notification when KYC is completed."""
    db = SessionLocal()
    try:
        opportunity = db.query(Opportunity).filter(
            Opportunity.id == opportunity_id
        ).first()
        if not opportunity:
            return {"status": "error", "message": "Opportunity not found"}

        # Create in-app notification
        notification = Notification(
            user_id=opportunity.created_by,
            opportunity_id=opportunity.id,
            type="kyc_completed",
            title="KYC Report Completed",
            message=f"AI KYC report for {opportunity.company_name} is ready.",
        )
        db.add(notification)

        # Send email
        creator = db.query(User).filter(User.id == opportunity.created_by).first()
        if creator:
            email_service.send_kyc_completed_email(
                to_email=creator.email,
                company_name=opportunity.company_name,
                opportunity_id=str(opportunity.id),
            )

        db.commit()
        return {"status": "success", "notification_id": str(notification.id)}
    except Exception as e:
        db.rollback()
        logger.error(f"Error sending KYC completed notification: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        db.close()


@celery_app.task(name="tasks.send_status_changed_notification")
def send_status_changed_notification(
    opportunity_id: str, old_status: str, new_status: str
) -> dict:
    """Send notification when opportunity status changes."""
    db = SessionLocal()
    try:
        opportunity = db.query(Opportunity).filter(
            Opportunity.id == opportunity_id
        ).first()
        if not opportunity:
            return {"status": "error", "message": "Opportunity not found"}

        # Create in-app notification
        notification = Notification(
            user_id=opportunity.created_by,
            opportunity_id=opportunity.id,
            type="status_changed",
            title="Status Changed",
            message=f"{opportunity.company_name}: {old_status} → {new_status}",
        )
        db.add(notification)

        # Send email
        creator = db.query(User).filter(User.id == opportunity.created_by).first()
        if creator:
            email_service.send_status_changed_email(
                to_email=creator.email,
                company_name=opportunity.company_name,
                old_status=old_status,
                new_status=new_status,
            )

        db.commit()
        return {"status": "success", "notification_id": str(notification.id)}
    except Exception as e:
        db.rollback()
        logger.error(f"Error sending status changed notification: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        db.close()


@celery_app.task(name="tasks.create_calendar_event")
def create_calendar_event(meeting_id: str) -> dict:
    """Create a Google Calendar event for a meeting."""
    db = SessionLocal()
    try:
        from app.models.meeting import Meeting

        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            return {"status": "error", "message": "Meeting not found"}

        opportunity = db.query(Opportunity).filter(
            Opportunity.id == meeting.opportunity_id
        ).first()

        company_name = opportunity.company_name if opportunity else "Unknown"

        # Parse participants (JSON list of emails)
        participants_data = meeting.participants or []
        if isinstance(participants_data, str):
            attendees = [p.strip() for p in participants_data.split(",") if p.strip()]
        else:
            attendees = [str(p).strip() for p in participants_data if str(p).strip()]

        # Default duration: 1 hour
        start_time = meeting.date
        end_time = start_time + timedelta(hours=1)

        event_id = calendar_service.create_meeting_event(
            title=f"{meeting.title} - {company_name}",
            description=f"Agenda: {meeting.agenda or 'N/A'}",
            start_time=start_time,
            end_time=end_time,
            attendees=attendees,
            location=meeting.location,
        )

        # Store event ID back to meeting
        if event_id:
            meeting.calendar_event_id = event_id
            db.commit()

        return {"status": "success", "event_id": event_id}
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating calendar event: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        db.close()


@celery_app.task(name="tasks.run_kyc_pipeline")
def run_kyc_pipeline_task(opportunity_id: str, source_type: str = "automatic") -> dict:
    """Run the AI KYC pipeline for an opportunity.

    This task:
    1. Sets opportunity status to 'KYC Running'
    2. Creates a KYCReport record
    3. Runs the LangGraph pipeline
    4. Saves results and updates status
    5. Sends completion notification
    """
    import asyncio
    import time
    from datetime import datetime, timezone

    from app.models.kyc_report import KYCReport
    from app.models.opportunity import TimelineEvent
    from app.services.kyc_pipeline import run_kyc_pipeline

    db = SessionLocal()
    try:
        opportunity = db.query(Opportunity).filter(
            Opportunity.id == opportunity_id
        ).first()
        if not opportunity:
            return {"status": "error", "message": "Opportunity not found"}
        # Check if there is already an active running report (e.g., created by regenerate endpoint)
        kyc_report = (
            db.query(KYCReport)
            .filter(
                KYCReport.opportunity_id == opportunity_id,
                KYCReport.status == "running",
            )
            .order_by(KYCReport.version.desc())
            .first()
        )

        if kyc_report:
            next_version = kyc_report.version
        else:
            # Determine next version number
            max_version = (
                db.query(KYCReport.version)
                .filter(KYCReport.opportunity_id == opportunity_id)
                .order_by(KYCReport.version.desc())
                .first()
            )
            next_version = (max_version[0] + 1) if max_version else 1

            # Create KYC report record
            kyc_report = KYCReport(
                opportunity_id=opportunity.id,
                version=next_version,
                status="running",
                source_type=source_type,
            )
            db.add(kyc_report)

        # Update opportunity status
        old_status = opportunity.status
        opportunity.status = "KYC Running"

        # Add timeline event
        timeline_event = TimelineEvent(
            opportunity_id=opportunity.id,
            actor_name="System",
            action=f"KYC Started (v{next_version})",
            description=f"AI KYC analysis initiated ({source_type}).",
            event_type="system",
        )
        db.add(timeline_event)
        db.commit()
        db.refresh(kyc_report)

        # Define progress callback
        def update_progress(step: str, percent: int):
            progress_db = SessionLocal()
            try:
                report = progress_db.query(KYCReport).filter(KYCReport.id == kyc_report.id).first()
                if report:
                    report.progress_step = step
                    report.progress_percent = percent
                    progress_db.commit()
            except Exception as e:
                logger.error(f"[KYC Task] Failed to update progress: {e}")
            finally:
                progress_db.close()

        # Update initial progress
        update_progress("received", 15)
        time.sleep(1.5)

        # Run the async pipeline
        result = asyncio.run(
            run_kyc_pipeline(
                company_name=opportunity.company_name,
                customer_needs=opportunity.customer_needs,
                website=opportunity.website,
                industry=opportunity.industry,
                product=opportunity.product,
                additional_notes=opportunity.additional_notes,
                on_progress=update_progress,
            )
        )

        if result.get("status") == "completed":
            # Save results to KYC report
            kyc_report.status = "completed"
            kyc_report.executive_summary = result.get("executive_summary")
            kyc_report.company_overview = result.get("company_overview")
            kyc_report.industry_analysis = result.get("industry_analysis")
            kyc_report.competitor_analysis = result.get("competitor_analysis")
            kyc_report.business_model = result.get("business_model")
            kyc_report.company_location = result.get("company_location")
            kyc_report.customer_need_summary = result.get("customer_need_summary")
            kyc_report.potential_pain_points = result.get("potential_pain_points")
            kyc_report.use_cases = result.get("use_cases")
            kyc_report.meeting_objectives = result.get("meeting_objectives")
            kyc_report.recommended_questions = result.get("recommended_questions")
            kyc_report.preparation_checklist = result.get("preparation_checklist")
            kyc_report.references = result.get("references")
            kyc_report.completed_at = datetime.now(timezone.utc)

            # Update opportunity status
            opportunity.status = "Ready Meeting"

            # Add timeline event
            timeline_complete = TimelineEvent(
                opportunity_id=opportunity.id,
                actor_name="System",
                action=f"KYC Completed (v{next_version})",
                description="AI KYC report generated successfully.",
                event_type="system",
            )
            db.add(timeline_complete)
            db.commit()

            # Send completion notification
            send_kyc_completed_notification.delay(str(opportunity.id))

            return {
                "status": "success",
                "report_id": str(kyc_report.id),
                "version": next_version,
            }
        else:
            # Pipeline failed
            kyc_report.status = "failed"
            kyc_report.error_message = result.get("error", "Unknown error")
            opportunity.status = old_status  # Revert status

            timeline_fail = TimelineEvent(
                opportunity_id=opportunity.id,
                actor_name="System",
                action=f"KYC Failed (v{next_version})",
                description=f"Error: {result.get('error', 'Unknown')}",
                event_type="system",
            )
            db.add(timeline_fail)
            db.commit()

            return {"status": "error", "message": result.get("error")}

    except Exception as e:
        db.rollback()
        logger.error(f"Error running KYC pipeline: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        db.close()


@celery_app.task(name="tasks.send_meeting_reminder")
def send_meeting_reminder(meeting_id: str, reminder_type: str = "h1") -> dict:
    """
    Send meeting reminder email.
    reminder_type: 'h1' (H-1 day) or 'h30' (H-30 minutes)
    """
    db = SessionLocal()
    try:
        from app.models.meeting import Meeting

        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            return {"status": "error", "message": "Meeting not found"}

        opportunity = db.query(Opportunity).filter(
            Opportunity.id == meeting.opportunity_id
        ).first()

        company_name = opportunity.company_name if opportunity else "Unknown"

        # Send to all participants
        attendees = [
            p.strip() for p in (meeting.participants or "").split(",") if p.strip()
        ]

        for email in attendees:
            email_service.send_meeting_reminder_email(
                to_email=email,
                company_name=company_name,
                meeting_title=meeting.title,
                meeting_date=meeting.date.strftime("%Y-%m-%d %H:%M"),
            )

        return {"status": "success", "reminders_sent": len(attendees)}
    except Exception as e:
        db.rollback()
        logger.error(f"Error sending meeting reminder: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        db.close()