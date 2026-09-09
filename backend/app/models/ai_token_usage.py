"""
Model for tracking AI token usage, estimated costs, and user prompt audit logs.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Numeric, Text, DateTime, ForeignKey, func, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class AITokenUsage(Base):
    """
    Append-only persistent log of all LLM invocations across the platform.
    Tracks token counts, costs (USD & IDR), acting user, target opportunity,
    and prompt query texts for superadmin auditing.
    """

    __tablename__ = "ai_token_usages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    opportunity_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("opportunities.id", ondelete="SET NULL"), nullable=True
    )

    # feature: opportunity_chat, kyc_generation, persona_generation, ai_validation, test_connection
    feature: Mapped[str] = mapped_column(String(50), nullable=False, default="opportunity_chat")

    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    provider: Mapped[str] = mapped_column(String(50), nullable=False, default="google")

    # Token breakdown
    prompt_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Cost calculations
    cost_usd: Mapped[float] = mapped_column(Numeric(10, 6), nullable=False, default=0.0)
    cost_idr: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0.0)

    # Audit & Inspection fields
    query_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    response_preview: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(String(50), nullable=False, default="success")  # success, error
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    metadata_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    user: Mapped["User | None"] = relationship("User", foreign_keys=[user_id], lazy="selectin")
    opportunity: Mapped["Opportunity | None"] = relationship("Opportunity", foreign_keys=[opportunity_id], lazy="selectin")

    __table_args__ = (
        Index("ix_ai_token_usages_created_at", "created_at"),
        Index("ix_ai_token_usages_user_id", "user_id"),
        Index("ix_ai_token_usages_opportunity_id", "opportunity_id"),
        Index("ix_ai_token_usages_feature", "feature"),
        Index("ix_ai_token_usages_model_name", "model_name"),
    )

    def __repr__(self) -> str:
        return f"<AITokenUsage {self.feature} model={self.model_name} total_tokens={self.total_tokens}>"
