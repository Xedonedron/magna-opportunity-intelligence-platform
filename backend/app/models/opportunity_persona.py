from __future__ import annotations

import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class OpportunityPersona(Base):
    __tablename__ = "opportunity_personas"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    opportunity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("opportunities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    seniority: Mapped[str] = mapped_column(String(50), nullable=False)
    department: Mapped[str] = mapped_column(String(50), nullable=False)

    # Structured AI response fields
    focus_areas: Mapped[list[dict] | None] = mapped_column(JSONB, nullable=True, default=list)
    questions: Mapped[list[dict] | None] = mapped_column(JSONB, nullable=True, default=list)
    value_props: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True, default=list)
    objection_handling: Mapped[list[dict] | None] = mapped_column(JSONB, nullable=True, default=list)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    opportunity = relationship("Opportunity", back_populates="personas")

    __table_args__ = (
        UniqueConstraint("opportunity_id", "seniority", "department", name="uq_opp_seniority_department"),
    )

    def __repr__(self) -> str:
        return f"<OpportunityPersona opp={self.opportunity_id} {self.seniority} {self.department}>"