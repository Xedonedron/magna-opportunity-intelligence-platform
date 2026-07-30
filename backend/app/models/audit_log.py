"""
Audit Log model for tracking all system changes.

Records who did what, when, and the before/after values.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Text, ForeignKey, func, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class AuditLog(Base):
    """Audit log entry for tracking changes to any entity."""

    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    # create, update, delete, status_change, login, logout, etc.

    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    # Opportunity, KYCReport, Meeting, User, etc.

    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)

    old_value: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # JSON snapshot of entity before change

    new_value: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # JSON snapshot of entity after change

    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    # IPv6 max length is 45 chars

    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)

    extra_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # Additional context (request_id, session_id, etc.)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    user: Mapped["User | None"] = relationship("User", lazy="selectin")

    # Indexes for common queries
    __table_args__ = (
        Index("ix_audit_logs_entity", "entity_type", "entity_id"),
        Index("ix_audit_logs_user", "user_id"),
        Index("ix_audit_logs_created_at", "created_at"),
        Index("ix_audit_logs_action", "action"),
    )

    def __repr__(self) -> str:
        return f"<AuditLog {self.action} {self.entity_type}:{self.entity_id}>"