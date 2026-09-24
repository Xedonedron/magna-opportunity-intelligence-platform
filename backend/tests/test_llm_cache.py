"""
Tests for LLM Factory DB Settings Caching & Connection Pool Configuration.
"""

import time
from unittest.mock import patch, MagicMock

import pytest

from app.core.llm import (
    get_db_setting,
    invalidate_settings_cache,
    _cache,
    _cache_lock,
    _CACHE_TTL,
)


@pytest.fixture(autouse=True)
def clear_cache():
    """Ensure cache is empty before and after each test."""
    invalidate_settings_cache()
    yield
    invalidate_settings_cache()


class _FakeRow:
    def __init__(self, key, value):
        self.key = key
        self.value = value


# ---------- TTL Cache tests ----------


def test_cache_hit_skips_db_query():
    """Second call within TTL must NOT query DB again."""
    fake_row = _FakeRow("llm_provider", "google")
    mock_session = MagicMock()
    mock_session.query.return_value.filter.return_value.first.return_value = fake_row

    # First call — cache miss, hits DB
    result1 = get_db_setting(mock_session, "llm_provider")
    assert result1 == "google"
    assert mock_session.query.call_count == 1

    # Second call — cache hit, NO additional DB query
    result2 = get_db_setting(mock_session, "llm_provider")
    assert result2 == "google"
    assert mock_session.query.call_count == 1  # still 1


def test_cache_expiry_re_queries_db():
    """After TTL expires, get_db_setting must query DB again."""
    fake_row = _FakeRow("ai_model", "gemma-4")
    mock_session = MagicMock()
    mock_session.query.return_value.filter.return_value.first.return_value = fake_row

    # Populate cache
    get_db_setting(mock_session, "ai_model")
    assert mock_session.query.call_count == 1

    # Simulate TTL expiry by backdating cache timestamp
    with _cache_lock:
        val, _ = _cache["ai_model"]
        _cache["ai_model"] = (val, time.monotonic() - _CACHE_TTL - 1)

    # Next call should re-query
    get_db_setting(mock_session, "ai_model")
    assert mock_session.query.call_count == 2


def test_invalidate_clears_cache():
    """invalidate_settings_cache() must empty the cache."""
    fake_row = _FakeRow("temperature", "0.7")
    mock_session = MagicMock()
    mock_session.query.return_value.filter.return_value.first.return_value = fake_row

    get_db_setting(mock_session, "temperature")
    assert len(_cache) > 0

    invalidate_settings_cache()
    assert len(_cache) == 0


def test_none_value_cached_returns_default():
    """When DB row value is None/empty, cache the miss and return default."""
    fake_row = _FakeRow("empty_key", "   ")
    mock_session = MagicMock()
    mock_session.query.return_value.filter.return_value.first.return_value = fake_row

    result = get_db_setting(mock_session, "empty_key", default="fallback")
    assert result == "fallback"

    # Should be cached as None — no second DB call
    result2 = get_db_setting(mock_session, "empty_key", default="fallback")
    assert result2 == "fallback"
    assert mock_session.query.call_count == 1


def test_bulk_load_on_self_managed_session():
    """When db=None and SessionLocal is used, bulk load all settings in 1 query."""
    rows = [
        _FakeRow("llm_provider", "openai"),
        _FakeRow("ai_model", "gpt-4"),
        _FakeRow("temperature", "0.5"),
    ]
    mock_session = MagicMock()
    mock_session.query.return_value.all.return_value = rows

    with patch("app.core.database.SessionLocal", return_value=mock_session):
        result = get_db_setting(None, "ai_model")

    assert result == "gpt-4"
    # All 3 keys should be cached from bulk load
    assert "llm_provider" in _cache
    assert "ai_model" in _cache
    assert "temperature" in _cache
    # Only 1 query (bulk .all()), not 1 per key
    mock_session.query.call_count == 1


# ---------- Connection Pool Config tests ----------


def test_pool_config_in_settings():
    """Settings must expose DB_POOL_SIZE, DB_MAX_OVERFLOW, DB_POOL_RECYCLE."""
    from app.core.config import settings

    assert settings.DB_POOL_SIZE == 20
    assert settings.DB_MAX_OVERFLOW == 30
    assert settings.DB_POOL_RECYCLE == 1800


def test_engine_uses_pool_config():
    """Engine must be configured with pool parameters from settings."""
    from app.core.database import engine

    assert engine.pool.size() == 20
    assert engine.pool._max_overflow == 30
    assert engine.pool._recycle == 1800
