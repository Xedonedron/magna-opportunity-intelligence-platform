import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func

from app.core.database import Base


class MasterSolution(Base):
    """
    Master Solutions Catalog Model.
    Stores concrete solutions, products, and case studies of PT Smartnet Magna Global
    used for AI KYC grounding, Presales Chat grounding, and UI catalog management.
    """
    __tablename__ = "master_solutions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(255), unique=True, index=True, nullable=True)
    title = Column(String(255), nullable=False, index=True)
    pillar = Column(String(100), nullable=False, index=True)  # Cloud Infrastructure, Data & AI, Cybersecurity, Network & Workplace
    tier = Column(Integer, nullable=False, default=1)  # 1 = High Value Concrete Product, 2 = Niche Strategic Framework
    
    # Structured technology and vertical tagging
    primary_products = Column(JSONB, nullable=False, default=list)  # ["Dataflow", "BigQuery", "Vertex AI"]
    all_products = Column(JSONB, nullable=True, default=list)
    target_industries = Column(JSONB, nullable=False, default=lambda: ["Enterprise General"])
    
    # Presales knowledge components
    key_subheadings = Column(JSONB, nullable=True, default=list)
    pain_points = Column(JSONB, nullable=True, default=list)
    business_impact = Column(Text, nullable=True)
    summary_snippet = Column(Text, nullable=True)
    source_url = Column(String(500), nullable=True)
    
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def to_dict(self):
        return {
            "id": str(self.id),
            "slug": self.slug,
            "title": self.title,
            "pillar": self.pillar,
            "tier": self.tier,
            "primary_products": self.primary_products or [],
            "all_products": self.all_products or [],
            "target_industries": self.target_industries or ["Enterprise General"],
            "key_subheadings": self.key_subheadings or [],
            "pain_points": self.pain_points or [],
            "business_impact": self.business_impact or "",
            "summary_snippet": self.summary_snippet or "",
            "source_url": self.source_url or "",
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
