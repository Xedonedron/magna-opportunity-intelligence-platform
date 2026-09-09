"""
AI Usage & Pricing Service

Tracks and calculates token usage, costs in USD & IDR, rate cards,
and provides analytics aggregations and prompt audit logs for Superadmin.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone, timedelta, date
from typing import Optional, Any, Tuple, Dict, List
from sqlalchemy.orm import Session, aliased
from sqlalchemy import func, desc, or_, and_

from app.models.ai_token_usage import AITokenUsage
from app.models.opportunity import Opportunity
from app.models.user import User
from app.core.database import SessionLocal

logger = logging.getLogger(__name__)

# Standard Model Pricing Catalog (Prices in USD per 1,000,000 tokens)
# (Input Price / 1M tokens, Output Price / 1M tokens)
MODEL_RATES: Dict[str, Tuple[float, float]] = {
    # Google AI Studio / Gemini Models
    "gemini-2.5-flash": (0.075, 0.30),
    "gemini-2.0-flash": (0.075, 0.30),
    "gemini-1.5-flash": (0.075, 0.30),
    "gemini-1.5-pro": (1.25, 5.00),
    "gemma-4-26b-a4b-it": (0.10, 0.20),
    "gemma-2-27b-it": (0.10, 0.20),
    "gemma-2-9b-it": (0.06, 0.12),
    # OpenAI / CosmosHub / Open Models
    "glm-4-plus": (1.00, 1.00),
    "glm-4-air": (0.20, 0.20),
    "deepseek-chat": (0.14, 0.28),
    "deepseek-v3": (0.14, 0.28),
    "deepseek-r1": (0.55, 2.19),
    "deepseek-reasoner": (0.55, 2.19),
    "gpt-4o-mini": (0.15, 0.60),
    "gpt-4o": (2.50, 10.00),
    # Default fallback rate
    "default": (0.20, 0.50),
}

DEFAULT_USD_TO_IDR: float = 16200.0


def get_model_rate(model_name: Optional[str]) -> Tuple[float, float]:
    """Retrieve (input_price_per_1m, output_price_per_1m) for a given model name."""
    if not model_name:
        return MODEL_RATES["default"]
    
    clean_name = model_name.strip().lower()
    
    # Exact match first
    if clean_name in MODEL_RATES:
        return MODEL_RATES[clean_name]
    
    # Substring matching
    for key, rate in MODEL_RATES.items():
        if key != "default" and key in clean_name:
            return rate
            
    return MODEL_RATES["default"]


def get_current_usd_to_idr_rate(db: Optional[Session] = None) -> float:
    """Retrieve current configured USD to IDR exchange rate from system_settings or default."""
    try:
        from app.models.system_setting import SystemSetting
        close_session = False
        session = db
        if session is None:
            session = SessionLocal()
            close_session = True
        try:
            row = session.query(SystemSetting).filter(SystemSetting.key == "usd_to_idr_rate").first()
            if row and row.value:
                return float(row.value)
        finally:
            if close_session:
                session.close()
    except Exception as e:
        logger.debug(f"[AI Usage Service] Failed to read usd_to_idr_rate from settings: {e}")
    return DEFAULT_USD_TO_IDR


def calculate_cost(
    model_name: Optional[str],
    prompt_tokens: int,
    completion_tokens: int,
    usd_to_idr_rate: Optional[float] = None,
) -> Tuple[float, float]:
    """
    Calculate estimated cost in (USD, IDR).
    Cost = (Prompt Tokens * Input Rate + Completion Tokens * Output Rate) / 1,000,000
    """
    if usd_to_idr_rate is None:
        usd_to_idr_rate = DEFAULT_USD_TO_IDR

    input_rate, output_rate = get_model_rate(model_name)
    
    cost_usd = (
        (prompt_tokens * input_rate) + (completion_tokens * output_rate)
    ) / 1_000_000.0
    
    cost_idr = cost_usd * usd_to_idr_rate
    
    # Round to reasonable display precision
    return round(cost_usd, 6), round(cost_idr, 2)


def estimate_tokens(text: Optional[str]) -> int:
    """
    Fallback token count estimation if upstream API does not provide usage metadata.
    Averages ~3.8 characters per token for multilingual English/Indonesian text.
    """
    if not text:
        return 0
    return max(1, int(len(text) / 3.8))


def record_ai_usage(
    db: Optional[Session],
    user_id: Optional[uuid.UUID] = None,
    opportunity_id: Optional[uuid.UUID] = None,
    feature: str = "opportunity_chat",
    model_name: str = "gemini-2.5-flash",
    provider: str = "google",
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    query_prompt: Optional[str] = None,
    response_preview: Optional[str] = None,
    status: str = "success",
    error_message: Optional[str] = None,
    duration_ms: Optional[int] = None,
    metadata_json: Optional[dict] = None,
) -> Optional[AITokenUsage]:
    """
    Persist an AI interaction log to the database safely.
    Handles session lifecycle if db is not supplied.
    """
    close_db = False
    session = db
    if session is None:
        session = SessionLocal()
        close_db = True

    active_rate = get_current_usd_to_idr_rate(session)
    total_tokens = prompt_tokens + completion_tokens
    cost_usd, cost_idr = calculate_cost(model_name, prompt_tokens, completion_tokens, usd_to_idr_rate=active_rate)

    try:
        usage_record = AITokenUsage(
            user_id=user_id,
            opportunity_id=opportunity_id,
            feature=feature,
            model_name=model_name or "unknown",
            provider=provider or "google",
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            cost_usd=cost_usd,
            cost_idr=cost_idr,
            query_prompt=query_prompt,
            response_preview=response_preview,
            status=status,
            error_message=error_message,
            duration_ms=duration_ms,
            metadata_json=metadata_json,
        )
        session.add(usage_record)
        session.commit()
        session.refresh(usage_record)
        return usage_record
    except Exception as e:
        logger.error(f"[AI Usage Service] Failed to persist usage record: {e}", exc_info=True)
        try:
            session.rollback()
        except Exception:
            pass
        return None
    finally:
        if close_db and session:
            session.close()


# =========================================================================
# Superadmin Analytics & Reporting Functions
# =========================================================================

def get_metrics_summary(db: Session) -> Dict[str, Any]:
    """
    Get summary KPIs for AI monitoring:
    - Today vs Yesterday vs All-time tokens & costs
    - Active AI users today
    - Model distribution breakdown
    - Feature distribution breakdown
    - 14-day daily trend
    """
    now = datetime.now(timezone.utc)
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    yesterday_start = today_start - timedelta(days=1)

    # 1. Today's Totals
    today_stats = db.query(
        func.coalesce(func.sum(AITokenUsage.prompt_tokens), 0).label("prompt_tokens"),
        func.coalesce(func.sum(AITokenUsage.completion_tokens), 0).label("completion_tokens"),
        func.coalesce(func.sum(AITokenUsage.total_tokens), 0).label("total_tokens"),
        func.coalesce(func.sum(AITokenUsage.cost_usd), 0.0).label("cost_usd"),
        func.coalesce(func.sum(AITokenUsage.cost_idr), 0.0).label("cost_idr"),
        func.count(AITokenUsage.id).label("requests_count"),
        func.count(func.distinct(AITokenUsage.user_id)).label("active_users"),
    ).filter(AITokenUsage.created_at >= today_start).first()

    # 2. Yesterday's Totals (for delta comparison)
    yesterday_stats = db.query(
        func.coalesce(func.sum(AITokenUsage.total_tokens), 0).label("total_tokens"),
        func.coalesce(func.sum(AITokenUsage.cost_usd), 0.0).label("cost_usd"),
        func.coalesce(func.sum(AITokenUsage.cost_idr), 0.0).label("cost_idr"),
        func.count(AITokenUsage.id).label("requests_count"),
    ).filter(
        AITokenUsage.created_at >= yesterday_start,
        AITokenUsage.created_at < today_start,
    ).first()

    # 3. All-time Totals
    all_time_stats = db.query(
        func.coalesce(func.sum(AITokenUsage.total_tokens), 0).label("total_tokens"),
        func.coalesce(func.sum(AITokenUsage.cost_usd), 0.0).label("cost_usd"),
        func.coalesce(func.sum(AITokenUsage.cost_idr), 0.0).label("cost_idr"),
        func.count(AITokenUsage.id).label("requests_count"),
    ).first()

    # 4. Model Breakdown
    model_rows = db.query(
        AITokenUsage.model_name,
        func.coalesce(func.sum(AITokenUsage.total_tokens), 0).label("total_tokens"),
        func.coalesce(func.sum(AITokenUsage.cost_usd), 0.0).label("cost_usd"),
        func.coalesce(func.sum(AITokenUsage.cost_idr), 0.0).label("cost_idr"),
        func.count(AITokenUsage.id).label("count"),
    ).group_by(AITokenUsage.model_name).order_by(desc("total_tokens")).all()

    total_tokens_all = float(all_time_stats.total_tokens) if all_time_stats and all_time_stats.total_tokens else 1.0
    model_breakdown = [
        {
            "model_name": r.model_name,
            "total_tokens": int(r.total_tokens),
            "cost_usd": float(r.cost_usd),
            "cost_idr": float(r.cost_idr),
            "count": int(r.count),
            "share_percentage": round((float(r.total_tokens) / total_tokens_all) * 100, 1),
        }
        for r in model_rows
    ]

    # 5. Feature Breakdown
    feature_rows = db.query(
        AITokenUsage.feature,
        func.coalesce(func.sum(AITokenUsage.total_tokens), 0).label("total_tokens"),
        func.coalesce(func.sum(AITokenUsage.cost_usd), 0.0).label("cost_usd"),
        func.coalesce(func.sum(AITokenUsage.cost_idr), 0.0).label("cost_idr"),
        func.count(AITokenUsage.id).label("count"),
    ).group_by(AITokenUsage.feature).order_by(desc("total_tokens")).all()

    feature_breakdown = [
        {
            "feature": r.feature,
            "total_tokens": int(r.total_tokens),
            "cost_usd": float(r.cost_usd),
            "cost_idr": float(r.cost_idr),
            "count": int(r.count),
        }
        for r in feature_rows
    ]

    # 6. Daily Trend (last 14 days)
    trend_start = today_start - timedelta(days=13)
    dialect_name = getattr(getattr(db, "bind", None), "dialect", None)
    is_sqlite = getattr(dialect_name, "name", "") == "sqlite"
    day_expr = func.date(AITokenUsage.created_at).label("day") if is_sqlite else func.date_trunc('day', AITokenUsage.created_at).label("day")

    daily_rows = db.query(
        day_expr,
        func.coalesce(func.sum(AITokenUsage.total_tokens), 0).label("total_tokens"),
        func.coalesce(func.sum(AITokenUsage.cost_usd), 0.0).label("cost_usd"),
        func.coalesce(func.sum(AITokenUsage.cost_idr), 0.0).label("cost_idr"),
        func.count(AITokenUsage.id).label("requests_count"),
    ).filter(AITokenUsage.created_at >= trend_start).group_by(day_expr).order_by(day_expr).all()

    daily_map = {
        r.day.strftime("%Y-%m-%d") if hasattr(r.day, "strftime") else str(r.day)[:10]: {
            "tokens": int(r.total_tokens),
            "cost_usd": float(r.cost_usd),
            "cost_idr": float(r.cost_idr),
            "requests": int(r.requests_count),
        }
        for r in daily_rows
    }

    daily_trend = []
    for i in range(14):
        d = trend_start + timedelta(days=i)
        d_str = d.strftime("%Y-%m-%d")
        entry = daily_map.get(d_str, {"tokens": 0, "cost_usd": 0.0, "cost_idr": 0.0, "requests": 0})
        daily_trend.append({
            "date": d_str,
            "display_date": d.strftime("%d %b"),
            "tokens": entry["tokens"],
            "cost_usd": entry["cost_usd"],
            "cost_idr": entry["cost_idr"],
            "requests": entry["requests"],
        })

    return {
        "today": {
            "prompt_tokens": int(today_stats.prompt_tokens) if today_stats else 0,
            "completion_tokens": int(today_stats.completion_tokens) if today_stats else 0,
            "total_tokens": int(today_stats.total_tokens) if today_stats else 0,
            "cost_usd": float(today_stats.cost_usd) if today_stats else 0.0,
            "cost_idr": float(today_stats.cost_idr) if today_stats else 0.0,
            "requests_count": int(today_stats.requests_count) if today_stats else 0,
            "active_users": int(today_stats.active_users) if today_stats else 0,
        },
        "yesterday": {
            "total_tokens": int(yesterday_stats.total_tokens) if yesterday_stats else 0,
            "cost_usd": float(yesterday_stats.cost_usd) if yesterday_stats else 0.0,
            "cost_idr": float(yesterday_stats.cost_idr) if yesterday_stats else 0.0,
            "requests_count": int(yesterday_stats.requests_count) if yesterday_stats else 0,
        },
        "all_time": {
            "total_tokens": int(all_time_stats.total_tokens) if all_time_stats else 0,
            "cost_usd": float(all_time_stats.cost_usd) if all_time_stats else 0.0,
            "cost_idr": float(all_time_stats.cost_idr) if all_time_stats else 0.0,
            "requests_count": int(all_time_stats.requests_count) if all_time_stats else 0,
        },
        "model_breakdown": model_breakdown,
        "feature_breakdown": feature_breakdown,
        "daily_trend": daily_trend,
        "usd_to_idr_rate": get_current_usd_to_idr_rate(db),
    }


def get_usage_by_opportunity(
    db: Session,
    search: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    page: int = 1,
    page_size: int = 15,
) -> Dict[str, Any]:
    """
    Get aggregated token usage grouped by Opportunity.
    Allows filtering by company_name or opportunity UUID.
    """
    query = db.query(
        AITokenUsage.opportunity_id,
        Opportunity.company_name,
        Opportunity.industry,
        func.coalesce(func.sum(AITokenUsage.prompt_tokens), 0).label("prompt_tokens"),
        func.coalesce(func.sum(AITokenUsage.completion_tokens), 0).label("completion_tokens"),
        func.coalesce(func.sum(AITokenUsage.total_tokens), 0).label("total_tokens"),
        func.coalesce(func.sum(AITokenUsage.cost_usd), 0.0).label("cost_usd"),
        func.coalesce(func.sum(AITokenUsage.cost_idr), 0.0).label("cost_idr"),
        func.count(AITokenUsage.id).label("requests_count"),
        func.count(
            func.nullif(AITokenUsage.feature != "opportunity_chat", True)
        ).label("chat_count"),
        func.max(AITokenUsage.created_at).label("last_used_at"),
    ).outerjoin(Opportunity, AITokenUsage.opportunity_id == Opportunity.id)

    query = query.filter(AITokenUsage.opportunity_id.isnot(None))

    if search:
        s = f"%{search.strip()}%"
        # Try if search is valid UUID
        is_uuid = False
        try:
            search_uuid = uuid.UUID(search.strip())
            is_uuid = True
        except ValueError:
            pass

        if is_uuid:
            query = query.filter(
                or_(Opportunity.company_name.ilike(s), AITokenUsage.opportunity_id == search_uuid)
            )
        else:
            query = query.filter(Opportunity.company_name.ilike(s))

    if date_from:
        query = query.filter(AITokenUsage.created_at >= datetime.combine(date_from, datetime.min.time(), tzinfo=timezone.utc))
    if date_to:
        query = query.filter(AITokenUsage.created_at <= datetime.combine(date_to, datetime.max.time(), tzinfo=timezone.utc))

    grouped = query.group_by(AITokenUsage.opportunity_id, Opportunity.company_name, Opportunity.industry)
    total_count = grouped.count()

    items = (
        grouped.order_by(desc("total_tokens"))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    result_items = [
        {
            "opportunity_id": str(r.opportunity_id),
            "company_name": r.company_name or "Opportunity Tanpa Nama",
            "industry": r.industry or "-",
            "prompt_tokens": int(r.prompt_tokens),
            "completion_tokens": int(r.completion_tokens),
            "total_tokens": int(r.total_tokens),
            "cost_usd": float(r.cost_usd),
            "cost_idr": float(r.cost_idr),
            "requests_count": int(r.requests_count),
            "chat_count": int(r.chat_count or 0),
            "last_used_at": r.last_used_at.isoformat() if r.last_used_at else None,
        }
        for r in items
    ]

    return {
        "items": result_items,
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total_count + page_size - 1) // page_size),
    }


def get_usage_by_user(
    db: Session,
    search: Optional[str] = None,
    role: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    page: int = 1,
    page_size: int = 15,
) -> Dict[str, Any]:
    """
    Get aggregated token usage grouped by User.
    Helps identify high-consumption users and potential AI Assistant abuse.
    """
    query = db.query(
        AITokenUsage.user_id,
        User.full_name,
        User.email,
        User.role,
        User.avatar_url,
        func.coalesce(func.sum(AITokenUsage.prompt_tokens), 0).label("prompt_tokens"),
        func.coalesce(func.sum(AITokenUsage.completion_tokens), 0).label("completion_tokens"),
        func.coalesce(func.sum(AITokenUsage.total_tokens), 0).label("total_tokens"),
        func.coalesce(func.sum(AITokenUsage.cost_usd), 0.0).label("cost_usd"),
        func.coalesce(func.sum(AITokenUsage.cost_idr), 0.0).label("cost_idr"),
        func.count(AITokenUsage.id).label("requests_count"),
        func.count(
            func.nullif(AITokenUsage.feature != "opportunity_chat", True)
        ).label("chat_count"),
        func.max(AITokenUsage.created_at).label("last_used_at"),
    ).outerjoin(User, AITokenUsage.user_id == User.id)

    query = query.filter(AITokenUsage.user_id.isnot(None))

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(or_(User.full_name.ilike(s), User.email.ilike(s)))

    if role:
        query = query.filter(User.role == role)

    if date_from:
        query = query.filter(AITokenUsage.created_at >= datetime.combine(date_from, datetime.min.time(), tzinfo=timezone.utc))
    if date_to:
        query = query.filter(AITokenUsage.created_at <= datetime.combine(date_to, datetime.max.time(), tzinfo=timezone.utc))

    grouped = query.group_by(AITokenUsage.user_id, User.full_name, User.email, User.role, User.avatar_url)
    total_count = grouped.count()

    items = (
        grouped.order_by(desc("total_tokens"))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    result_items = [
        {
            "user_id": str(r.user_id),
            "full_name": r.full_name or "Pengguna Anonim",
            "email": r.email or "-",
            "role": r.role or "user",
            "avatar_url": r.avatar_url,
            "prompt_tokens": int(r.prompt_tokens),
            "completion_tokens": int(r.completion_tokens),
            "total_tokens": int(r.total_tokens),
            "cost_usd": float(r.cost_usd),
            "cost_idr": float(r.cost_idr),
            "requests_count": int(r.requests_count),
            "chat_count": int(r.chat_count or 0),
            "last_used_at": r.last_used_at.isoformat() if r.last_used_at else None,
        }
        for r in items
    ]

    return {
        "items": result_items,
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total_count + page_size - 1) // page_size),
    }


def get_assistant_queries_audit(
    db: Session,
    user_id: Optional[uuid.UUID] = None,
    opportunity_id: Optional[uuid.UUID] = None,
    feature: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    page: int = 1,
    page_size: int = 15,
) -> Dict[str, Any]:
    """
    Granular prompt & query audit trail for Superadmin.
    Shows the exact prompt user submitted, model used, response preview, tokens, and cost.
    Filters out automatic / v1 KYC synthesis to prevent cluttering the user prompt audit,
    and only includes KYC regenerations (v2+) that are the latest version per opportunity.
    """
    LaterUsage = aliased(AITokenUsage)

    has_newer_kyc = (
        db.query(LaterUsage.id)
        .filter(
            LaterUsage.opportunity_id == AITokenUsage.opportunity_id,
            LaterUsage.feature == "kyc_generation",
            or_(
                LaterUsage.created_at > AITokenUsage.created_at,
                and_(
                    LaterUsage.created_at == AITokenUsage.created_at,
                    LaterUsage.id != AITokenUsage.id,
                    LaterUsage.query_prompt > AITokenUsage.query_prompt,
                ),
            ),
        )
        .exists()
    )

    # Valid KYC condition: Must be versioned >= v2 (not legacy or v1), not automatic, and latest per oppty
    valid_kyc_condition = and_(
        AITokenUsage.feature == "kyc_generation",
        AITokenUsage.query_prompt.like("KYC Pipeline Synthesis (v%"),
        ~AITokenUsage.query_prompt.like("KYC Pipeline Synthesis (v1 %"),
        ~AITokenUsage.query_prompt.like("%automatic%"),
        ~has_newer_kyc,
    )

    query = db.query(
        AITokenUsage,
        User.full_name.label("user_name"),
        User.email.label("user_email"),
        User.role.label("user_role"),
        Opportunity.company_name.label("company_name"),
    ).outerjoin(User, AITokenUsage.user_id == User.id)\
     .outerjoin(Opportunity, AITokenUsage.opportunity_id == Opportunity.id)

    # Feature filtering
    if feature:
        f_clean = feature.strip().lower()
        if f_clean in ("chat", "opportunity_chat"):
            query = query.filter(AITokenUsage.feature == "opportunity_chat")
        elif f_clean in ("kyc", "kyc_generation"):
            query = query.filter(valid_kyc_condition)
        elif f_clean in ("persona", "persona_generation"):
            query = query.filter(AITokenUsage.feature == "persona_generation")
        else:
            query = query.filter(AITokenUsage.feature == feature)
    else:
        # Default: Exclude automatic v1 KYC generation from prompt audit trail
        query = query.filter(
            or_(
                AITokenUsage.feature != "kyc_generation",
                valid_kyc_condition,
            )
        )

    if user_id:
        query = query.filter(AITokenUsage.user_id == user_id)

    if opportunity_id:
        query = query.filter(AITokenUsage.opportunity_id == opportunity_id)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                AITokenUsage.query_prompt.ilike(s),
                AITokenUsage.response_preview.ilike(s),
                User.full_name.ilike(s),
                Opportunity.company_name.ilike(s),
            )
        )

    if date_from:
        query = query.filter(AITokenUsage.created_at >= datetime.combine(date_from, datetime.min.time(), tzinfo=timezone.utc))
    if date_to:
        query = query.filter(AITokenUsage.created_at <= datetime.combine(date_to, datetime.max.time(), tzinfo=timezone.utc))

    total_count = query.count()

    rows = (
        query.order_by(AITokenUsage.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for usage, u_name, u_email, u_role, comp_name in rows:
        items.append({
            "id": str(usage.id),
            "created_at": usage.created_at.isoformat() if usage.created_at else None,
            "feature": usage.feature,
            "model_name": usage.model_name,
            "provider": usage.provider,
            "prompt_tokens": usage.prompt_tokens,
            "completion_tokens": usage.completion_tokens,
            "total_tokens": usage.total_tokens,
            "cost_usd": float(usage.cost_usd),
            "cost_idr": float(usage.cost_idr),
            "query_prompt": usage.query_prompt,
            "response_preview": usage.response_preview,
            "status": usage.status,
            "error_message": usage.error_message,
            "duration_ms": usage.duration_ms,
            "metadata_json": usage.metadata_json or {},
            "user": {
                "id": str(usage.user_id) if usage.user_id else None,
                "full_name": u_name or "System / Background",
                "email": u_email or "-",
                "role": u_role or "system",
            },
            "opportunity": {
                "id": str(usage.opportunity_id) if usage.opportunity_id else None,
                "company_name": comp_name or "General / Non-opportunity",
            },
        })

    return {
        "items": items,
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total_count + page_size - 1) // page_size),
    }
