"""Dashboard API schemas."""

from pydantic import BaseModel
from typing import Optional


class DashboardFilters(BaseModel):
    """Filters for dashboard data."""
    status: Optional[str] = None
    engineer_id: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None


class StatusCount(BaseModel):
    """Count by status."""
    status: str
    count: int


class ProductCount(BaseModel):
    """Count by product."""
    product: str
    count: int


class IndustryCount(BaseModel):
    """Count by industry."""
    industry: str
    count: int


class EngineerCount(BaseModel):
    """Count by engineer."""
    engineer_id: str
    engineer_name: str
    count: int


class TrendData(BaseModel):
    """Daily trend data point."""
    date: str
    new: int
    won: int
    lost: int


class RecentOpportunity(BaseModel):
    """Recent opportunity summary."""
    id: str
    company_name: str
    status: str
    engineer_name: Optional[str] = None
    created_at: str


class UpcomingMeeting(BaseModel):
    """Upcoming meeting summary."""
    opportunity_id: str
    company_name: str
    meeting_schedule: str
    meeting_type: Optional[str] = None


class DashboardMetrics(BaseModel):
    """Dashboard metrics response."""
    total_opportunities: int
    total_potential_revenue: float = 0.0
    by_status: list[StatusCount]
    by_engineer: list[EngineerCount]
    meetings_today: int
    kyc_running: int
    need_follow_up: int
    recent_opportunities: list[RecentOpportunity]
    upcoming_meetings: list[UpcomingMeeting]
    trend_data: list[TrendData]
    
    # New metrics for managers
    won_rate: float
    active_count: int
    by_product: list[ProductCount]
    by_industry: list[IndustryCount]
    
    # Role-based visibility
    user_role: str
    filtered_by_user: bool