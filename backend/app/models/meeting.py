import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    opportunity_id = Column(
        UUID(as_uuid=True),
        ForeignKey("opportunities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(255), nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    location = Column(String(255), nullable=True)  # Zoom, Google Meet, Office, etc.
    participants = Column(JSON, nullable=True)  # List of participant names/emails
    agenda = Column(JSON, nullable=True)  # List of agenda items
    notes = Column(Text, nullable=True)
    action_items = Column(JSON, nullable=True)  # List of action items
    attachments = Column(JSON, nullable=True)  # List of attachment URLs/metadata
    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    # Relationships
    opportunity = relationship("Opportunity", back_populates="meetings")
    creator = relationship("User", foreign_keys=[created_by])