"""
Celery tasks for notification processing.

Handles async email sending and calendar event creation.
"""

import logging
import uuid
from datetime import datetime, timedelta

from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.notification import Notification
from app.core.opportunity_status import (
    DEFAULT_OPPORTUNITY_STATUS,
    KYC_COMPLETED_STATUS,
    KYC_RUNNING_STATUS,
    TERMINAL_OPPORTUNITY_STATUSES,
)
from app.models.opportunity import Opportunity
from app.models.company import Company
from app.models.user import User
from app.services.email_service import email_service
from app.services.calendar_service import calendar_service
from app.services.notification_service import NotificationService
from app.services import kyc_pipeline

logger = logging.getLogger(__name__)


@celery_app.task(name="tasks.send_opportunity_created_notification")
def send_opportunity_created_notification(opportunity_id: str) -> dict:
    """Send email notification when a new opportunity is created.
    Note: In-app notifications are already created synchronously via NotificationService.notify_opportunity_created.
    """
    db = SessionLocal()
    try:
        opportunity = db.query(Opportunity).filter(
            Opportunity.id == opportunity_id
        ).first()
        if not opportunity:
            return {"status": "error", "message": "Opportunity not found"}

        # Send email to creator
        creator = db.query(User).filter(User.id == opportunity.created_by).first()
        if creator:
            email_service.send_opportunity_created_email(
                to_email=creator.email,
                company_name=opportunity.company_name,
                opportunity_id=str(opportunity.id),
            )

        return {"status": "success"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error sending opportunity created notification: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        db.close()


@celery_app.task(name="tasks.send_kyc_completed_notification")
def send_kyc_completed_notification(opportunity_id: str, version: int = 1) -> dict:
    """Send email notification when KYC is completed.
    Note: In-app notifications are already created in run_kyc_pipeline_task via NotificationService.notify_kyc_completed.
    """
    db = SessionLocal()
    try:
        opportunity = db.query(Opportunity).filter(
            Opportunity.id == opportunity_id
        ).first()
        if not opportunity:
            return {"status": "error", "message": "Opportunity not found"}

        # Send email
        creator = db.query(User).filter(User.id == opportunity.created_by).first()
        if creator:
            email_service.send_kyc_completed_email(
                to_email=creator.email,
                company_name=opportunity.company_name,
                opportunity_id=str(opportunity.id),
            )

        return {"status": "success"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error sending KYC completed notification: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        db.close()


@celery_app.task(name="tasks.send_status_changed_notification")
def send_status_changed_notification(
    opportunity_id: str, old_status: str, new_status: str, actor_id: str = None
) -> dict:
    """Send email notification when opportunity status changes.
    Note: In-app notifications are already created synchronously via NotificationService.notify_status_changed.
    """
    db = SessionLocal()
    try:
        opportunity = db.query(Opportunity).filter(
            Opportunity.id == opportunity_id
        ).first()
        if not opportunity:
            return {"status": "error", "message": "Opportunity not found"}

        # Send email
        creator = db.query(User).filter(User.id == opportunity.created_by).first()
        if creator:
            email_service.send_status_changed_email(
                to_email=creator.email,
                company_name=opportunity.company_name,
                old_status=old_status,
                new_status=new_status,
            )

        return {"status": "success"}
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
def run_kyc_pipeline_task(
    opportunity_id: str,
    source_type: str = "automatic",
    focus_notes: str | None = None,
    model_name: str | None = None,
    regenerate_scope: str = "deal_only",
) -> dict:
    """Run the AI KYC pipeline for an opportunity.

    This task:
    1. Sets opportunity status to 'Research Only'
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

    db = SessionLocal()
    try:
        opp_uuid = uuid.UUID(opportunity_id) if isinstance(opportunity_id, str) else opportunity_id
        opportunity = db.query(Opportunity).filter(
            Opportunity.id == opp_uuid
        ).first()
        if not opportunity:
            return {"status": "error", "message": "Opportunity not found"}
        # Idempotency: reuse existing running report instead of creating duplicates
        kyc_report = (
            db.query(KYCReport)
            .filter(
                KYCReport.opportunity_id == opp_uuid,
                KYCReport.status == "running",
            )
            .order_by(KYCReport.version.desc())
            .first()
        )

        if kyc_report:
            next_version = kyc_report.version
        else:
            # Safe version generation: use DB-level max to avoid race conditions.
            # If two workers query simultaneously they may get the same max_version.
            # We flush+commit early and catch IntegrityError to handle the race gracefully.
            max_version = (
                db.query(KYCReport.version)
                .filter(KYCReport.opportunity_id == opp_uuid)
                .order_by(KYCReport.version.desc())
                .first()
            )
            next_version = (max_version[0] + 1) if max_version else 1

            # Create KYC report record
            kyc_report = KYCReport(
                id=uuid.uuid4(),
                opportunity_id=opportunity.id,
                version=next_version,
                status="running",
                source_type=source_type,
            )
            db.add(kyc_report)
            try:
                db.flush()
            except Exception:
                # Race condition: another worker already created this version.
                # Rollback and try to reuse the running report instead.
                db.rollback()
                kyc_report = (
                    db.query(KYCReport)
                    .filter(
                        KYCReport.opportunity_id == opp_uuid,
                        KYCReport.status == "running",
                    )
                    .order_by(KYCReport.version.desc())
                    .first()
                )
                if kyc_report:
                    next_version = kyc_report.version
                else:
                    return {"status": "error", "message": "Version conflict — report already exists"}

        # Update opportunity status atomically in the worker (not in the API layer).
        # Only transition to "Research Only" if status is "Lead In". Preserve higher
        # pipeline statuses (e.g. "Contact Made") to avoid status regression.
        old_status = opportunity.status
        if opportunity.status == DEFAULT_OPPORTUNITY_STATUS:
            opportunity.status = KYC_RUNNING_STATUS

        # Add timeline event
        desc_text = f"AI KYC analysis initiated ({source_type})."
        if model_name:
            desc_text += f" Model: {model_name}."
        timeline_event = TimelineEvent(
            opportunity_id=opportunity.id,
            actor_name="System",
            action=f"KYC Started (v{next_version})",
            description=desc_text,
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

        # Check for company profile to reuse (Zero-Redundant KYC)
        effective_company_id = opportunity.company_id
        existing_company_profile = None

        if not effective_company_id and (opportunity.website or opportunity.company_name):
            from app.api.companies import compute_normalized_name, extract_root_domain
            matched_company = None

            # 1. Match by root domain if website exists — indexed query
            opp_domain = extract_root_domain(opportunity.website) if opportunity.website else None
            if opp_domain:
                matched_company = db.query(Company).filter(Company.root_domain == opp_domain).first()

            # 2. Fallback to normalized company name
            if not matched_company and opportunity.company_name:
                norm_name = compute_normalized_name(opportunity.company_name)
                matched_company = db.query(Company).filter(
                    (Company.normalized_name == norm_name) |
                    (Company.normalized_name == f"{norm_name} indonesia") |
                    (Company.normalized_name == norm_name.removesuffix(" indonesia").strip())
                ).first()

            if matched_company:
                effective_company_id = matched_company.id
                opportunity.company_id = matched_company.id
                db.commit()

        if effective_company_id:
            # regenerate_scope="full" forces fresh Module 1 & 2 generation (bypass cache)
            if regenerate_scope == "full":
                existing_company_profile = None
                logger.info(
                    "[KYC Task] regenerate_scope='full' — bypassing cached Company Profile for Company %s. Full Modules 1-6 will be generated.",
                    effective_company_id,
                )
            else:
                prior_kyc = (
                    db.query(KYCReport)
                    .join(Opportunity, Opportunity.id == KYCReport.opportunity_id)
                    .filter(
                        Opportunity.company_id == effective_company_id,
                        KYCReport.status == "completed",
                        KYCReport.company_overview.isnot(None),
                    )
                    .order_by(KYCReport.completed_at.desc(), KYCReport.created_at.desc())
                    .first()
                )
                if prior_kyc and prior_kyc.company_overview:
                    existing_company_profile = {
                        "company_overview": prior_kyc.company_overview,
                        "industry_analysis": prior_kyc.industry_analysis,
                        "competitor_analysis": prior_kyc.competitor_analysis or [],
                        "business_model": prior_kyc.business_model or "",
                        "company_location": prior_kyc.company_location or "",
                        "source_opportunity_id": str(prior_kyc.opportunity_id),
                        "source_kyc_version": prior_kyc.version,
                    }
                    logger.info(
                        "[KYC Task] Reusing verified Company Profile for Company ID %s (from Opportunity %s v%s). Executing Opportunity Deal Pipeline (Modules 3-6) only.",
                        effective_company_id,
                        prior_kyc.opportunity_id,
                        prior_kyc.version,
                    )

        # Gather Living Opportunity Intelligence (MoM & Attached Documents) for Layer B
        from app.models.meeting import Meeting
        from app.models.opportunity import OpportunityDocument

        meetings_rows = (
            db.query(Meeting)
            .filter(Meeting.opportunity_id == opportunity.id)
            .order_by(Meeting.date.desc())
            .all()
        )
        meeting_history = [
            {
                "title": m.title,
                "date": m.date.strftime("%Y-%m-%d %H:%M") if m.date else "N/A",
                "location": m.location,
                "agenda": m.agenda or [],
                "notes": m.notes,
                "action_items": m.action_items or [],
            }
            for m in meetings_rows
        ]

        doc_rows = (
            db.query(OpportunityDocument)
            .filter(OpportunityDocument.opportunity_id == opportunity.id)
            .order_by(OpportunityDocument.created_at.desc())
            .all()
        )
        uploaded_documents = [
            {
                "title": d.title,
                "url": d.url,
                "description": d.description,
                "labels": d.labels or [],
                "uploaded_at": d.created_at.strftime("%Y-%m-%d") if d.created_at else None,
            }
            for d in doc_rows
        ]

        # Run the async pipeline with in-place retry for transient errors
        effective_focus = focus_notes or (kyc_report.focus_notes if kyc_report else None)
        max_task_retries = 3
        result = {}
        last_pipeline_error = None

        for attempt in range(1, max_task_retries + 1):
            if attempt > 1:
                logger.info(
                    f"[KYC Task] In-place retry attempt {attempt}/{max_task_retries} for opportunity {opportunity.id} (v{next_version})..."
                )
                update_progress("analyzing", 75)

            try:
                result = asyncio.run(
                    kyc_pipeline.run_kyc_pipeline(
                        company_name=opportunity.company_name,
                        customer_needs=opportunity.customer_needs,
                        website=opportunity.website,
                        industry=opportunity.industry,
                        product=opportunity.product,
                        additional_notes=opportunity.additional_notes,
                        on_progress=update_progress,
                        opportunity_id=str(opportunity.id),
                        user_id=str(opportunity.created_by) if opportunity.created_by else None,
                        kyc_version=next_version,
                        source_type=source_type,
                        focus_notes=effective_focus,
                        model_name=model_name,
                        company_id=str(effective_company_id) if effective_company_id else None,
                        existing_company_profile=existing_company_profile,
                        meeting_history=meeting_history,
                        uploaded_documents=uploaded_documents,
                    )
                )
            except Exception as task_exc:
                logger.error(f"[KYC Task] Pipeline exception on attempt {attempt}: {task_exc}")
                result = {"status": "failed", "error": str(task_exc)}

            if result.get("status") == "completed":
                break

            last_pipeline_error = result.get("error", "Unknown error")
            if not _is_retryable_kyc_error(last_pipeline_error) or attempt == max_task_retries:
                break

            retry_delay = attempt * 3
            logger.warning(
                f"[KYC Task] Attempt {attempt}/{max_task_retries} for v{next_version} failed with transient error: {last_pipeline_error}. "
                f"Retrying in-place in {retry_delay}s without creating a new version..."
            )
            time.sleep(retry_delay)

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

            # Update opportunity status — only advance to "Prospect Qualified" if
            # current status is "Research Only" or "Lead In". Do NOT regress status
            # for opportunities already at "Contact Made" or later stages.
            if opportunity.status in (KYC_RUNNING_STATUS, DEFAULT_OPPORTUNITY_STATUS):
                opportunity.status = KYC_COMPLETED_STATUS

            # Add timeline event
            reused_flag = result.get("reused_company_profile", False)
            desc = "AI KYC report generated successfully."
            if reused_flag:
                desc = "AI KYC report generated successfully (reused verified company profile - Modules 1 & 2 cached)."

            timeline_complete = TimelineEvent(
                opportunity_id=opportunity.id,
                actor_name="System",
                action=f"KYC Completed (v{next_version})",
                description=desc,
                event_type="system",
            )
            db.add(timeline_complete)

            # Auto-enrich Company business process & industry if empty
            if effective_company_id:
                comp_rec = db.query(Company).filter(Company.id == effective_company_id).first()
                if comp_rec:
                    if not comp_rec.industry and opportunity.industry:
                        comp_rec.industry = opportunity.industry
                    if not comp_rec.business_process and result.get("business_model"):
                        comp_rec.business_process = str(result["business_model"])
                    db.add(comp_rec)

            # In-app notifications for all stakeholders & superadmins
            NotificationService.notify_kyc_completed(
                db, opportunity, version=next_version
            )
            db.commit()

            # Send completion notification (email)
            send_kyc_completed_notification.delay(str(opportunity.id), version=next_version)

            return {
                "status": "success",
                "report_id": str(kyc_report.id),
                "version": next_version,
            }
        else:
            # Pipeline failed after all retries exhausted
            err_msg = result.get("error") or last_pipeline_error or "Unknown error"
            kyc_report.status = "failed"
            kyc_report.error_message = err_msg
            opportunity.status = old_status  # Revert status

            timeline_fail = TimelineEvent(
                opportunity_id=opportunity.id,
                actor_name="System",
                action=f"KYC Failed (v{next_version})",
                description=f"Error: {err_msg}",
                event_type="system",
            )
            db.add(timeline_fail)

            # In-app notification for failure
            NotificationService.notify_kyc_failed(
                db, opportunity, error_message=err_msg, version=next_version
            )
            db.commit()

            return {"status": "error", "message": err_msg}

    except Exception as e:
        db.rollback()
        logger.error(f"Error running KYC pipeline: {e}")
        try:
            opp_err = db.query(Opportunity).filter(Opportunity.id == opportunity_id).first()
            if opp_err:
                NotificationService.notify_kyc_failed(
                    db, opp_err, error_message=str(e), version=next_version
                )
                db.commit()
        except Exception:
            pass
        return {"status": "error", "message": str(e)}
    finally:
        db.close()


def _is_retryable_kyc_error(err_msg: str) -> bool:
    """Determine if a pipeline failure is transient/retryable in-place on the existing report version."""
    if not err_msg:
        return False
    msg_lower = err_msg.lower()
    fatal_patterns = [
        "no llm api key",
        "api key not found",
        "invalid api key",
        "authentication failed",
        "opportunity not found",
        "account suspended",
        "billing disabled",
    ]
    for pattern in fatal_patterns:
        if pattern in msg_lower:
            return False
    return True


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

        # Send to all participants (handles JSON list or comma-separated string)
        raw_participants = meeting.participants or []
        if isinstance(raw_participants, str):
            attendees = [p.strip() for p in raw_participants.split(",") if p.strip()]
        else:
            attendees = [str(p).strip() for p in raw_participants if str(p).strip()]

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


@celery_app.task(name="tasks.check_upcoming_meetings_and_stale_deals")
def check_upcoming_meetings_and_stale_deals_task(
    meeting_window_hours: int = 24,
    stale_days_threshold: int = 7,
) -> dict:
    """Periodic task to:
    1. Send reminders (in-app + email) for upcoming meetings within the next `meeting_window_hours` hours
       (with deduplication so each meeting only triggers one reminder per window).
    2. Alert stakeholders on active opportunities that have been stagnant (`updated_at < now - stale_days_threshold`)
       without spamming if an unread or recent (< 7 days) stale notification already exists.
    """
    from datetime import timezone
    from app.models.meeting import Meeting

    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        window_end = now + timedelta(hours=meeting_window_hours)
        stale_cutoff = now - timedelta(days=stale_days_threshold)

        meeting_reminders_triggered = 0
        stale_alerts_triggered = 0

        # 1. Check upcoming meetings in (now, now + 24h]
        upcoming_meetings = (
            db.query(Meeting)
            .filter(
                Meeting.date > now,
                Meeting.date <= window_end,
            )
            .all()
        )

        for meeting in upcoming_meetings:
            opportunity = (
                db.query(Opportunity)
                .filter(Opportunity.id == meeting.opportunity_id)
                .first()
            )
            if not opportunity or opportunity.status in ("Closed Lost", "Hold"):
                continue

            meeting_id_str = str(meeting.id)
            existing_reminder = (
                db.query(Notification)
                .filter(
                    Notification.opportunity_id == opportunity.id,
                    Notification.type == "meeting_reminder",
                    Notification.metadata_json.like(f"%{meeting_id_str}%"),
                )
                .first()
            )
            if existing_reminder:
                continue

            m_date_str = (
                meeting.date.strftime("%d %b %Y, %H:%M")
                if meeting.date
                else "Upcoming"
            )
            NotificationService.notify_meeting_reminder(
                db=db,
                opportunity=opportunity,
                meeting_id=meeting.id,
                meeting_title=meeting.title,
                meeting_date_str=m_date_str,
                reminder_window=f"{meeting_window_hours}h",
            )
            meeting_reminders_triggered += 1

            # Trigger email reminder asynchronously (or fallback synchronously if broker unavailable)
            try:
                send_meeting_reminder.delay(meeting_id_str, reminder_type="h1")
            except Exception as email_exc:
                logger.warning(f"Failed to enqueue meeting email reminder for {meeting_id_str}: {email_exc}")

        # 2. Check active opportunities stagnant for >= stale_days_threshold days
        stale_opportunities = (
            db.query(Opportunity)
            .filter(
                Opportunity.status.notin_(TERMINAL_OPPORTUNITY_STATUSES),
                Opportunity.updated_at <= stale_cutoff,
            )
            .all()
        )

        for opp in stale_opportunities:
            # Deduplication: skip if there is already an unread stale_opportunity notification
            # or any stale_opportunity notification created within the last stale_days_threshold days
            existing_stale_notif = (
                db.query(Notification)
                .filter(
                    Notification.opportunity_id == opp.id,
                    Notification.type == "stale_opportunity",
                    (
                        (Notification.is_read == False)
                        | (Notification.created_at >= stale_cutoff)
                    ),
                )
                .first()
            )
            if existing_stale_notif:
                continue

            opp_updated = opp.updated_at
            if opp_updated and opp_updated.tzinfo is None:
                opp_updated = opp_updated.replace(tzinfo=timezone.utc)
            days_stagnant = (
                max(stale_days_threshold, (now - opp_updated).days)
                if opp_updated
                else stale_days_threshold
            )

            NotificationService.notify_stale_opportunity(
                db=db,
                opportunity=opp,
                days_stagnant=days_stagnant,
            )
            stale_alerts_triggered += 1

        db.commit()
        return {
            "status": "success",
            "meeting_reminders_triggered": meeting_reminders_triggered,
            "stale_alerts_triggered": stale_alerts_triggered,
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error checking upcoming meetings and stale deals: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        db.close()
