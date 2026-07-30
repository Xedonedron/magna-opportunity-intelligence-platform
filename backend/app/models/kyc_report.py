from __future__ import annotations

import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Text, ForeignKey, Integer, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class KYCReport(Base):
    __tablename__ = "kyc_reports"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    opportunity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("opportunities.id", ondelete="CASCADE"),
        nullable=False,
    )
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    # Status: pending, running, completed, failed

    # KYC Output Sections (stored as JSONB for flexibility)
    executive_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    company_overview: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    industry_analysis: Mapped[str | None] = mapped_column(Text, nullable=True)
    business_model: Mapped[str | None] = mapped_column(Text, nullable=True)
    company_location: Mapped[str | None] = mapped_column(Text, nullable=True)
    customer_need_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    potential_pain_points: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    use_cases: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    meeting_objectives: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    recommended_questions: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    preparation_checklist: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    references: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    # Metadata
    progress_step: Mapped[str | None] = mapped_column(String(50), default="pending", nullable=True)
    progress_percent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    source_type: Mapped[str] = mapped_column(String(50), default="automatic")
    # source_type: automatic, manual_regenerate, engineer_edited
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    opportunity: Mapped["Opportunity"] = relationship(back_populates="kyc_reports")

    def __repr__(self) -> str:
        return f"<KYCReport v{self.version} ({self.status})>"