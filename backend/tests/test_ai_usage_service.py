"""
Unit tests for AI Usage & Pricing Service and Admin Monitoring Endpoints.
"""

import uuid
from datetime import datetime, timezone
import pytest
from sqlalchemy.orm import Session

from app.models.ai_token_usage import AITokenUsage
from app.models.user import User
from app.models.opportunity import Opportunity
from app.services.ai_usage_service import (
    calculate_cost,
    estimate_tokens,
    get_model_rate,
    record_ai_usage,
    get_metrics_summary,
    get_usage_by_opportunity,
    get_usage_by_user,
    get_assistant_queries_audit,
)


def test_calculate_cost_standard_models():
    """Test cost calculation with known rates."""
    # gemini-2.5-flash: $0.075 / 1M input, $0.30 / 1M output
    cost_usd, cost_idr = calculate_cost("gemini-2.5-flash", 1000, 1000, usd_to_idr_rate=16000.0)
    # prompt: (1000 * 0.075) / 1,000,000 = 0.000075
    # completion: (1000 * 0.30) / 1,000,000 = 0.000300
    # total usd = 0.000375
    assert cost_usd == 0.000375
    assert cost_idr == round(0.000375 * 16000.0, 2)


def test_estimate_tokens():
    """Test fallback token estimation."""
    assert estimate_tokens("") == 0
    assert estimate_tokens(None) == 0
    # ~38 chars -> ~10 tokens
    text = "Halo, saya ingin bertanya tentang Google Cloud BigQuery."
    tokens = estimate_tokens(text)
    assert tokens > 0
    assert tokens == max(1, int(len(text) / 3.8))


def test_record_ai_usage_and_aggregations(db: Session):
    """Test persisting AI usage record and querying aggregations."""
    user = User(
        id=uuid.uuid4(),
        email="superadmin@example.com",
        full_name="Super Admin Test",
        role="superadmin",
        is_active=True,
    )
    opp = Opportunity(
        id=uuid.uuid4(),
        company_name="PT Teknologi Maju",
        customer_needs="Modernisasi infrastruktur cloud",
        created_by=user.id,
    )
    db.add_all([user, opp])
    db.commit()

    # Record 1: Chat interaction
    usage1 = record_ai_usage(
        db=db,
        user_id=user.id,
        opportunity_id=opp.id,
        feature="opportunity_chat",
        model_name="gemini-2.5-flash",
        provider="google",
        prompt_tokens=500,
        completion_tokens=250,
        query_prompt="Bagaimana cara migrasi ke BigQuery?",
        response_preview="Solusi migrasi BigQuery meliputi...",
        status="success",
        duration_ms=1200,
    )
    assert usage1 is not None
    assert usage1.total_tokens == 750
    assert usage1.cost_usd > 0
    assert usage1.cost_idr > 0

    # Record 2: KYC generation
    usage2 = record_ai_usage(
        db=db,
        user_id=user.id,
        opportunity_id=opp.id,
        feature="kyc_generation",
        model_name="gemini-2.5-flash",
        provider="google",
        prompt_tokens=2000,
        completion_tokens=1500,
        query_prompt="KYC Pipeline Synthesis for PT Teknologi Maju",
        status="success",
        duration_ms=4500,
    )
    assert usage2 is not None
    assert usage2.total_tokens == 3500

    # Test Metrics Summary
    metrics = get_metrics_summary(db)
    assert metrics["today"]["total_tokens"] >= 4250
    assert metrics["today"]["requests_count"] >= 2
    assert metrics["today"]["active_users"] == 1
    assert len(metrics["model_breakdown"]) >= 1
    assert len(metrics["feature_breakdown"]) >= 2

    # Test Usage by Opportunity
    opp_summary = get_usage_by_opportunity(db, search="Teknologi Maju")
    assert opp_summary["total"] == 1
    assert opp_summary["items"][0]["company_name"] == "PT Teknologi Maju"
    assert opp_summary["items"][0]["total_tokens"] == 4250
    assert opp_summary["items"][0]["chat_count"] == 1

    # Test Usage by User
    user_summary = get_usage_by_user(db, search="Super Admin")
    assert user_summary["total"] == 1
    assert user_summary["items"][0]["full_name"] == "Super Admin Test"
    assert user_summary["items"][0]["total_tokens"] == 4250
    assert user_summary["items"][0]["chat_count"] == 1

    # Test Assistant Queries Audit (Verify v1 automatic KYC is excluded)
    # Notice usage2 was legacy/automatic v1 ("KYC Pipeline Synthesis for PT Teknologi Maju"),
    # so it should NOT be included in audit logs. Only usage1 (Chat) should appear!
    all_audit_logs = get_assistant_queries_audit(db)
    assert all_audit_logs["total"] == 1
    assert all_audit_logs["items"][0]["feature"] == "opportunity_chat"

    audit_logs = get_assistant_queries_audit(db, search="BigQuery")
    assert audit_logs["total"] == 1
    assert "BigQuery" in audit_logs["items"][0]["query_prompt"]
    assert audit_logs["items"][0]["user"]["full_name"] == "Super Admin Test"
    assert audit_logs["items"][0]["opportunity"]["company_name"] == "PT Teknologi Maju"

    # Now add KYC v2 manual regeneration
    usage3 = record_ai_usage(
        db=db,
        user_id=user.id,
        opportunity_id=opp.id,
        feature="kyc_generation",
        model_name="gemini-2.5-flash",
        provider="google",
        prompt_tokens=2200,
        completion_tokens=1600,
        query_prompt="KYC Pipeline Synthesis (v2 - manual_regenerate) for PT Teknologi Maju",
        metadata_json={"kyc_version": 2, "source_type": "manual_regenerate"},
        status="success",
        duration_ms=4800,
    )
    assert usage3 is not None

    # Audit query should now include Chat and KYC v2
    updated_logs = get_assistant_queries_audit(db)
    assert updated_logs["total"] == 2
    prompts = [item["query_prompt"] for item in updated_logs["items"]]
    assert any("v2 - manual_regenerate" in p for p in prompts)

    # Now add KYC v3 manual regeneration for same opportunity (should supersede v2, keeping only latest)
    import time
    time.sleep(0.01)
    usage4 = record_ai_usage(
        db=db,
        user_id=user.id,
        opportunity_id=opp.id,
        feature="kyc_generation",
        model_name="gemini-2.5-flash",
        provider="google",
        prompt_tokens=2300,
        completion_tokens=1700,
        query_prompt="KYC Pipeline Synthesis (v3 - manual_regenerate) for PT Teknologi Maju",
        metadata_json={"kyc_version": 3, "source_type": "manual_regenerate"},
        status="success",
        duration_ms=5000,
    )
    assert usage4 is not None

    latest_logs = get_assistant_queries_audit(db)
    # Total should still be 2 (1 Chat + 1 latest KYC v3)
    assert latest_logs["total"] == 2
    latest_prompts = [item["query_prompt"] for item in latest_logs["items"]]
    assert any("v3 - manual_regenerate" in p for p in latest_prompts)
    assert not any("v2 - manual_regenerate" in p for p in latest_prompts)

    # Feature filter test
    chat_only = get_assistant_queries_audit(db, feature="chat")
    assert chat_only["total"] == 1
    assert chat_only["items"][0]["feature"] == "opportunity_chat"

    kyc_only = get_assistant_queries_audit(db, feature="kyc")
    assert kyc_only["total"] == 1
    assert "v3" in kyc_only["items"][0]["query_prompt"]
