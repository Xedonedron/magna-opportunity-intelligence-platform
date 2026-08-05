"""Dashboard API endpoints with role-based filtering."""

import uuid
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func as sa_func, or_, and_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.models.opportunity import Opportunity
from app.api.auth import get_current_user
from app.schemas.dashboard import (
    DashboardMetrics,
    StatusCount,
    EngineerCount,
    TrendData,
    RecentOpportunity,
    UpcomingMeeting,
    ProductCount,
    IndustryCount,
)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

# Status groupings
KYC_RUNNING_STATUSES = ["KYC Running"]
FOLLOW_UP_STATUSES = ["Need Follow Up", "Meeting Done", "Need Proposal"]


@router.get("/metrics", response_model=DashboardMetrics)
async def get_dashboard_metrics(
    status: Optional[str] = Query(None),
    engineer_name: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get dashboard metrics with role-based filtering.
    
    Role logic:
    - admin/manager: See all data, can filter by engineer
    - lgo: See only opportunities they created
    - engineer: See only opportunities assigned to them
    """
    user_role = current_user.role
    filtered_by_user = False
    
    # Base query
    query = db.query(Opportunity)
    
    # Apply role-based filtering
    if user_role == "lgo":
        query = query.filter(Opportunity.created_by == current_user.id)
        filtered_by_user = True
    # engineer, presales, admin, manager, superadmin see all dashboard metrics
    
    # Apply optional filters
    if status:
        query = query.filter(Opportunity.status == status)
    
    if engineer_name and user_role in ["admin", "superadmin", "manager"]:
        query = query.filter(Opportunity.assigned_engineer == engineer_name)
    
    if date_from:
        query = query.filter(Opportunity.created_at >= date_from)
    
    if date_to:
        query = query.filter(Opportunity.created_at < date_to + timedelta(days=1))
    
    # Total count and total potential revenue
    total_opportunities = query.count()
    revenue_sum = (
        db.query(sa_func.coalesce(sa_func.sum(Opportunity.potential_revenue), 0))
        .filter(query.whereclause) if query.whereclause is not None else db.query(
            sa_func.coalesce(sa_func.sum(Opportunity.potential_revenue), 0)
        )
    ).scalar() or 0
    total_potential_revenue = float(revenue_sum)
    
    # By status
    status_counts = (
        db.query(
            Opportunity.status,
            sa_func.count(Opportunity.id).label("count")
        )
        .filter(query.whereclause) if query.whereclause is not None else db.query(
            Opportunity.status,
            sa_func.count(Opportunity.id).label("count")
        )
    )
    
    # Re-apply role filter for status counts
    status_query = db.query(
        Opportunity.status,
        sa_func.count(Opportunity.id).label("count")
    )
    if user_role == "lgo":
        status_query = status_query.filter(Opportunity.created_by == current_user.id)
    if status:
        status_query = status_query.filter(Opportunity.status == status)
    if engineer_name and user_role in ["admin", "superadmin", "manager"]:
        status_query = status_query.filter(Opportunity.assigned_engineer == engineer_name)
    if date_from:
        status_query = status_query.filter(Opportunity.created_at >= date_from)
    if date_to:
        status_query = status_query.filter(Opportunity.created_at < date_to + timedelta(days=1))
    
    status_results = status_query.group_by(Opportunity.status).all()
    by_status = [
        StatusCount(status=s or "Unknown", count=c)
        for s, c in status_results
    ]
    
    # By engineer (only for admin/manager)
    by_engineer = []
    if user_role in ["admin", "superadmin", "manager"]:
        engineer_query = db.query(
            Opportunity.assigned_engineer,
            sa_func.count(Opportunity.id).label("count")
        )
        if status:
            engineer_query = engineer_query.filter(Opportunity.status == status)
        if engineer_name:
            engineer_query = engineer_query.filter(Opportunity.assigned_engineer == engineer_name)
        if date_from:
            engineer_query = engineer_query.filter(Opportunity.created_at >= date_from)
        if date_to:
            engineer_query = engineer_query.filter(Opportunity.created_at < date_to + timedelta(days=1))
        
        engineer_results = (
            engineer_query
            .group_by(Opportunity.assigned_engineer)
            .all()
        )
        by_engineer = [
            EngineerCount(
                engineer_id=name or "unassigned",
                engineer_name=name or "Unassigned",
                count=c
            )
            for name, c in engineer_results
        ]
    
    # Specific counts
    kyc_query = db.query(Opportunity)
    if user_role == "lgo":
        kyc_query = kyc_query.filter(Opportunity.created_by == current_user.id)
    
    kyc_running = kyc_query.filter(
        Opportunity.status.in_(KYC_RUNNING_STATUSES)
    ).count()
    
    need_follow_up = db.query(Opportunity)
    if user_role == "lgo":
        need_follow_up = need_follow_up.filter(Opportunity.created_by == current_user.id)
    need_follow_up = need_follow_up.filter(
        Opportunity.status.in_(FOLLOW_UP_STATUSES)
    ).count()
    
    # Meetings today
    today = date.today()
    meetings_query = db.query(Opportunity).filter(
        sa_func.date(Opportunity.meeting_schedule) == today
    )
    if user_role == "lgo":
        meetings_query = meetings_query.filter(Opportunity.created_by == current_user.id)
    meetings_today = meetings_query.count()
    
    # Recent opportunities
    recent_query = db.query(Opportunity)
    if user_role == "lgo":
        recent_query = recent_query.filter(Opportunity.created_by == current_user.id)
    recent_results = (
        recent_query
        .order_by(Opportunity.created_at.desc())
        .limit(10)
        .all()
    )
    recent_opportunities = [
        RecentOpportunity(
            id=str(opp.id),
            company_name=opp.company_name,
            status=opp.status or "Unknown",
            engineer_name=opp.assigned_engineer.full_name if opp.assigned_engineer else None,
            created_at=opp.created_at.isoformat() if opp.created_at else "",
        )
        for opp in recent_results
    ]
    
    # Upcoming meetings (next 7 days)
    upcoming_query = db.query(Opportunity).filter(
        and_(
            Opportunity.meeting_schedule >= datetime.now(),
            Opportunity.meeting_schedule < datetime.now() + timedelta(days=7)
        )
    )
    if user_role == "lgo":
        upcoming_query = upcoming_query.filter(Opportunity.created_by == current_user.id)
    upcoming_results = (
        upcoming_query
        .order_by(Opportunity.meeting_schedule)
        .limit(5)
        .all()
    )
    upcoming_meetings = [
        UpcomingMeeting(
            opportunity_id=str(opp.id),
            company_name=opp.company_name,
            meeting_schedule=opp.meeting_schedule.isoformat() if opp.meeting_schedule else "",
            meeting_type=None,
        )
        for opp in upcoming_results
    ]
    
    # Trend data (last 30 days)
    trend_data = []
    for i in range(30):
        day = date.today() - timedelta(days=29 - i)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day + timedelta(days=1), datetime.min.time())
        
        new_count = db.query(Opportunity).filter(
            Opportunity.created_at >= day_start,
            Opportunity.created_at < day_end,
        )
        won_count = db.query(Opportunity).filter(
            Opportunity.status == "Won",
            Opportunity.updated_at >= day_start,
            Opportunity.updated_at < day_end,
        )
        lost_count = db.query(Opportunity).filter(
            Opportunity.status == "Lost",
            Opportunity.updated_at >= day_start,
            Opportunity.updated_at < day_end,
        )
        
        if user_role == "lgo":
            new_count = new_count.filter(Opportunity.created_by == current_user.id)
            won_count = won_count.filter(Opportunity.created_by == current_user.id)
            lost_count = lost_count.filter(Opportunity.created_by == current_user.id)
        
        trend_data.append(TrendData(
            date=day.isoformat(),
            new=new_count.count(),
            won=won_count.count(),
            lost=lost_count.count(),
        ))

    # New Manager Metrics Calculations
    total_won = query.filter(Opportunity.status == "Won").count()
    total_lost = query.filter(Opportunity.status == "Lost").count()
    closed_count = total_won + total_lost
    won_rate = float(total_won) / closed_count * 100.0 if closed_count > 0 else 0.0

    active_count = query.filter(
        ~Opportunity.status.in_(["Won", "Lost", "On Hold"])
    ).count()

    # Product count aggregation
    product_query = db.query(
        Opportunity.product,
        sa_func.count(Opportunity.id).label("count")
    )
    if user_role == "lgo":
        product_query = product_query.filter(Opportunity.created_by == current_user.id)
    if status:
        product_query = product_query.filter(Opportunity.status == status)
    if engineer_id and user_role in ["admin", "superadmin", "manager"]:
        product_query = product_query.filter(Opportunity.assigned_engineer_id == engineer_id)
    if date_from:
        product_query = product_query.filter(Opportunity.created_at >= date_from)
    if date_to:
        product_query = product_query.filter(Opportunity.created_at < date_to + timedelta(days=1))
        
    product_counts = product_query.group_by(Opportunity.product).all()
    by_product = [
        ProductCount(product=p or "None", count=c)
        for p, c in product_counts
    ]

    # Industry count aggregation
    industry_query = db.query(
        Opportunity.industry,
        sa_func.count(Opportunity.id).label("count")
    )
    if user_role == "lgo":
        industry_query = industry_query.filter(Opportunity.created_by == current_user.id)
    if status:
        industry_query = industry_query.filter(Opportunity.status == status)
    if engineer_id and user_role in ["admin", "superadmin", "manager"]:
        industry_query = industry_query.filter(Opportunity.assigned_engineer_id == engineer_id)
    if date_from:
        industry_query = industry_query.filter(Opportunity.created_at >= date_from)
    if date_to:
        industry_query = industry_query.filter(Opportunity.created_at < date_to + timedelta(days=1))
        
    industry_counts = industry_query.group_by(Opportunity.industry).all()
    by_industry = [
        IndustryCount(industry=ind or "None", count=c)
        for ind, c in industry_counts
    ]
    
    return DashboardMetrics(
        total_opportunities=total_opportunities,
        total_potential_revenue=total_potential_revenue,
        by_status=by_status,
        by_engineer=by_engineer,
        meetings_today=meetings_today,
        kyc_running=kyc_running,
        need_follow_up=need_follow_up,
        recent_opportunities=recent_opportunities,
        upcoming_meetings=upcoming_meetings,
        trend_data=trend_data,
        won_rate=won_rate,
        active_count=active_count,
        by_product=by_product,
        by_industry=by_industry,
        user_role=user_role,
        filtered_by_user=filtered_by_user,
    )