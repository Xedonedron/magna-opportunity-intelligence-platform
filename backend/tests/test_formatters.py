import pytest
from app.core.formatters import (
    format_duration_human,
    extract_rate_limit_seconds,
    humanize_rate_limit_message,
)
from app.core.exceptions import RateLimitError


def test_format_duration_human_exact_user_examples():
    # 5 jam 27 menit 3 detik = 5*3600 + 27*60 + 3 = 19623 seconds
    assert format_duration_human(19623) == "5 jam 27 menit 3 detik"
    
    # 52927 seconds (Lusha actual reset message from earlier)
    # 52927 // 3600 = 14 hours, remainder 2527 // 60 = 42 mins, rem 7 secs
    assert format_duration_human(52927) == "14 jam 42 menit 7 detik"
    
    # Edge cases
    assert format_duration_human(0) == "0 detik"
    assert format_duration_human(-10) == "0 detik"
    assert format_duration_human(45) == "45 detik"
    assert format_duration_human(60) == "1 menit"
    assert format_duration_human(65) == "1 menit 5 detik"
    assert format_duration_human(3600) == "1 jam"
    assert format_duration_human(3605) == "1 jam 5 detik"
    assert format_duration_human(86400) == "1 hari"
    assert format_duration_human(90061) == "1 hari 1 jam 1 menit 1 detik"


def test_extract_rate_limit_seconds_from_lusha_json():
    msg = "Daily API rate limit exceeded. Limit: 100 calls per day. Reset in 52927 seconds."
    assert extract_rate_limit_seconds(msg) == 52927

    data = {
        "statusCode": 429,
        "message": "Daily API rate limit exceeded. Limit: 100 calls per day. Reset in 19623 seconds."
    }
    assert extract_rate_limit_seconds(data) == 19623


def test_extract_rate_limit_seconds_from_headers():
    headers = {"retry-after": "120"}
    assert extract_rate_limit_seconds({}, headers=headers) == 120

    headers_case = {"Retry-After": "45"}
    assert extract_rate_limit_seconds("", headers=headers_case) == 45


def test_humanize_rate_limit_message():
    lusha_msg = "Daily API rate limit exceeded. Limit: 100 calls per day. Reset in 19623 seconds."
    humanized = humanize_rate_limit_message(lusha_msg)
    assert "5 jam 27 menit 3 detik" in humanized
    assert "Batas kuota harian API Lusha tercapai" in humanized

    another_msg = "Rate limit exceeded. Reset in 52927 seconds."
    assert "14 jam 42 menit 7 detik" in humanize_rate_limit_message(another_msg)

    # Test with minutes format
    min_msg = "Reset in 327 minutes."
    assert "5 jam 27 menit" in humanize_rate_limit_message(min_msg)


def test_rate_limit_error_exception():
    err = RateLimitError(retry_after=19623)
    assert "5 jam 27 menit 3 detik" in err.message
    assert err.details.get("retry_after") == 19623
    assert err.details.get("retry_after_formatted") == "5 jam 27 menit 3 detik"
