"""KYC Report API endpoints."""

from __future__ import annotations

import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.models.opportunity import Opportunity, TimelineEvent
from app.models.kyc_report import KYCReport
from app.schemas.kyc import (
    KYCReportResponse,
    KYCReportListResponse,
    KYCReportUpdate,
    KYCRegenerateRequest,
)
from app.core.security import get_current_user, require_capability
from app.tasks import run_kyc_pipeline_task
from app.services.audit_service import AuditService

router = APIRouter(prefix="/api/opportunities/{opportunity_id}/kyc", tags=["kyc"])


def _get_opportunity_or_404(db: Session, opportunity_id: uuid.UUID) -> Opportunity:
    opportunity = db.query(Opportunity).filter(Opportunity.id == opportunity_id).first()
    if opportunity is None:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return opportunity


@router.get("", response_model=KYCReportResponse | None)
async def get_latest_kyc_report(
    opportunity_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the latest (highest version) KYC report for an opportunity."""
    _get_opportunity_or_404(db, opportunity_id)

    report = (
        db.query(KYCReport)
        .filter(KYCReport.opportunity_id == opportunity_id)
        .order_by(KYCReport.version.desc())
        .first()
    )

    if report is None:
        return None

    return report


@router.get("/versions", response_model=KYCReportListResponse)
async def list_kyc_versions(
    opportunity_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all KYC report versions for an opportunity."""
    _get_opportunity_or_404(db, opportunity_id)

    reports = (
        db.query(KYCReport)
        .filter(KYCReport.opportunity_id == opportunity_id)
        .order_by(KYCReport.version.desc())
        .all()
    )

    return KYCReportListResponse(items=reports, total=len(reports))


@router.get("/{report_id}", response_model=KYCReportResponse)
async def get_kyc_report_by_id(
    opportunity_id: uuid.UUID,
    report_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific KYC report by ID."""
    _get_opportunity_or_404(db, opportunity_id)

    report = (
        db.query(KYCReport)
        .filter(KYCReport.id == report_id, KYCReport.opportunity_id == opportunity_id)
        .first()
    )

    if report is None:
        raise HTTPException(status_code=404, detail="KYC report not found")

    return report


@router.post("/regenerate", response_model=KYCReportResponse, status_code=status.HTTP_202_ACCEPTED)
async def regenerate_kyc_report(
    opportunity_id: uuid.UUID,
    data: KYCRegenerateRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("generate_kyc")),
):
    """Trigger KYC regeneration for an opportunity.

    Creates a new version and runs the AI pipeline asynchronously.
    """
    opportunity = _get_opportunity_or_404(db, opportunity_id)

    # Determine next version
    max_version = (
        db.query(KYCReport.version)
        .filter(KYCReport.opportunity_id == opportunity_id)
        .order_by(KYCReport.version.desc())
        .first()
    )
    next_version = (max_version[0] + 1) if max_version else 1

    source_type = data.source_type if data else "manual_regenerate"
    title = (data.title.strip() if data.title else None) if data else None
    focus_notes = (data.focus_notes.strip() if data.focus_notes else None) if data else None

    # Create a placeholder report with 'running' status
    report = KYCReport(
        id=uuid.uuid4(),
        opportunity_id=opportunity.id,
        version=next_version,
        title=title,
        focus_notes=focus_notes,
        status="running",
        source_type=source_type,
    )
    db.add(report)
    db.flush()

    # Log timeline event
    title_suffix = f" - '{title}'" if title else ""
    timeline_event = TimelineEvent(
        opportunity_id=opportunity.id,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        action=f"KYC Regeneration Started (v{next_version}{title_suffix})",
        description=f"KYC regeneration triggered ({source_type})." + (f" Focus: {focus_notes}" if focus_notes else ""),
        event_type="system",
    )
    db.add(timeline_event)

    # Log to AuditService
    try:
        AuditService(db).log_kyc_create(
            kyc_report_id=report.id,
            opportunity_id=opportunity.id,
            user_id=current_user.id,
            version=next_version,
            source_type=source_type,
            company_name=opportunity.company_name,
        )
    except Exception:
        pass

    db.commit()
    db.refresh(report)

    # Trigger async KYC pipeline
    try:
        run_kyc_pipeline_task.delay(
            str(opportunity.id),
            source_type=source_type,
            focus_notes=focus_notes,
        )
    except Exception:
        pass  # Don't fail the request if trigger fails

    return report


@router.patch("/{report_id}", response_model=KYCReportResponse)
async def update_kyc_report(
    opportunity_id: uuid.UUID,
    report_id: uuid.UUID,
    data: KYCReportUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_capability("create_edit")),
):
    """Edit a KYC report (engineer edits or version title change).

    Updates the report and marks source_type as 'engineer_edited' unless only title is changed.
    """
    opp = _get_opportunity_or_404(db, opportunity_id)

    report = (
        db.query(KYCReport)
        .filter(KYCReport.id == report_id, KYCReport.opportunity_id == opportunity_id)
        .first()
    )

    if report is None:
        raise HTTPException(status_code=404, detail="KYC report not found")

    update_data = data.model_dump(exclude_unset=True)
    if "use_cases" in update_data and isinstance(update_data["use_cases"], list):
        impact_order = {"High": 0, "Medium": 1, "Low": 2}
        update_data["use_cases"] = sorted(
            update_data["use_cases"],
            key=lambda uc: impact_order.get(
                uc.get("impact_level", "Medium") if isinstance(uc, dict) else "Medium", 99
            )
        )

    only_title_edit = set(update_data.keys()).issubset({"title", "focus_notes"})

    for field, value in update_data.items():
        setattr(report, field, value)

    # Mark as engineer edited only if substantive fields were modified
    if not only_title_edit:
        report.source_type = "engineer_edited"

    # Log timeline event
    action_text = f"KYC Version Note Updated (v{report.version})" if only_title_edit else f"KYC Report Edited (v{report.version})"
    desc_text = f"Version title updated to '{report.title}'." if only_title_edit else "Engineer manually edited the KYC report."

    timeline_event = TimelineEvent(
        opportunity_id=opportunity_id,
        actor_id=current_user.id,
        actor_name=current_user.full_name,
        action=action_text,
        description=desc_text,
        event_type="update",
    )
    db.add(timeline_event)

    # Log to AuditService
    try:
        AuditService(db).log_kyc_edit(
            kyc_report_id=report.id,
            user_id=current_user.id,
            old_value={},
            new_value=update_data,
            company_name=opp.company_name,
        )
    except Exception:
        pass

    db.commit()
    db.refresh(report)

    return report