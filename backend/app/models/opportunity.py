from __future__ import annotations

import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Text, ForeignKey, Numeric, Float, func, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.user import User  # noqa: F401


class Opportunity(Base):
    __tablename__ = "opportunities"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    website: Mapped[str | None] = mapped_column(String(500), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    contacts: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True, default=list)
    industry: Mapped[str | None] = mapped_column(String(255), nullable=True)
    product: Mapped[str | None] = mapped_column(String(255), nullable=True)
    customer_needs: Mapped[str] = mapped_column(Text, nullable=False)
    additional_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    potential_revenue: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    estimated_agenda_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    status: Mapped[str] = mapped_column(String(50), default="New", nullable=False)
    # Status: New, KYC Running, Ready Meeting, Meeting Scheduled, Meeting Done,
    #         Need Proposal, Negotiation, PO, Won, Lost, On Hold
    meeting_schedule: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    assigned_engineer: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    creator: Mapped["User"] = relationship(
        "User", foreign_keys=[created_by], lazy="joined"
    )
    timeline_events: Mapped[list["TimelineEvent"]] = relationship(
        back_populates="opportunity", cascade="all, delete-orphan", lazy="selectin"
    )
    meetings: Mapped[list["Meeting"]] = relationship(
        back_populates="opportunity", cascade="all, delete-orphan", lazy="selectin"
    )
    notifications: Mapped[list["Notification"]] = relationship(
        back_populates="opportunity", cascade="all, delete-orphan", lazy="selectin"
    )
    kyc_reports: Mapped[list["KYCReport"]] = relationship(
        back_populates="opportunity", cascade="all, delete-orphan", lazy="selectin"
    )
    chat_messages: Mapped[list["OpportunityChatMessage"]] = relationship(
        back_populates="opportunity", cascade="all, delete-orphan", lazy="selectin"
    )
    documents: Mapped[list["OpportunityDocument"]] = relationship(
        back_populates="opportunity", cascade="all, delete-orphan", lazy="selectin"
    )
    personas: Mapped[list["OpportunityPersona"]] = relationship(
        "OpportunityPersona",
        back_populates="opportunity",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Opportunity {self.company_name} ({self.status})>"


class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    opportunity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("opportunities.id", ondelete="CASCADE"), nullable=False
    )
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    actor_name: Mapped[str] = mapped_column(String(255), default="System")
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    event_type: Mapped[str] = mapped_column(String(50), default="system")
    # event_type: create, update, meeting, system, status_change
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    opportunity: Mapped["Opportunity"] = relationship(back_populates="timeline_events")

    def __repr__(self) -> str:
        return f"<TimelineEvent {self.action}>"


class OpportunityChatMessage(Base):
    __tablename__ = "opportunity_chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    opportunity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("opportunities.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # user, assistant
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    opportunity: Mapped["Opportunity"] = relationship(back_populates="chat_messages")

    def __repr__(self) -> str:
        return f"<OpportunityChatMessage {self.role} to {self.opportunity_id}>"


class OpportunityDocument(Base):
    __tablename__ = "opportunity_documents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    opportunity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("opportunities.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    url: Mapped[str] = mapped_column(String(2000), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    labels: Mapped[list[str] | None] = mapped_column(JSON, nullable=True, default=list)
    uploaded_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    opportunity: Mapped["Opportunity"] = relationship(back_populates="documents")
    uploader: Mapped["User"] = relationship("User", foreign_keys=[uploaded_by], lazy="joined")

    def __repr__(self) -> str:
        return f"<OpportunityDocument {self.title}>"
