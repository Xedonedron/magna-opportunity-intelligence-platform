"""
Formatting utilities for MOIP, including human-readable duration
and rate limit error messages.
"""

from __future__ import annotations

import re
from typing import Any, Dict, Optional, Union


def format_duration_human(total_seconds: Union[int, float]) -> str:
    """
    Format seconds into natural, readable Indonesian duration.
    e.g.:
      19623 -> "5 jam 27 menit 3 detik"
      52927 -> "14 jam 42 menit 7 detik"
      65    -> "1 menit 5 detik"
      3600  -> "1 jam"
      3605  -> "1 jam 5 detik"
      90061 -> "1 hari 1 jam 1 menit 1 detik"
      0     -> "0 detik"
    """
    sec = max(0, int(round(total_seconds)))
    if sec == 0:
        return "0 detik"

    days, rem = divmod(sec, 86400)
    hours, rem = divmod(rem, 3600)
    minutes, seconds = divmod(rem, 60)

    parts: list[str] = []
    if days > 0:
        parts.append(f"{days} hari")
    if hours > 0:
        parts.append(f"{hours} jam")
    if minutes > 0:
        parts.append(f"{minutes} menit")
    if seconds > 0 or not parts:
        parts.append(f"{seconds} detik")

    return " ".join(parts)


def extract_rate_limit_seconds(
    raw_input: Any,
    headers: Optional[Dict[str, str]] = None,
) -> Optional[int]:
    """
    Attempt to extract rate-limit duration in seconds from response bodies,
    error messages, or HTTP headers (Retry-After, x-ratelimit-reset).
    """
    # 1. Check HTTP headers if provided
    if headers:
        for k, v in headers.items():
            k_lower = k.lower()
            if k_lower == "retry-after" and str(v).strip().isdigit():
                return int(v)
            if "ratelimit-reset" in k_lower and str(v).strip().isdigit():
                val = int(v)
                # If epoch timestamp (> 1_000_000_000)
                import time
                now = int(time.time())
                if val > 1_000_000_000:
                    return max(0, val - now)
                return val

    # 2. Check string message
    if isinstance(raw_input, str):
        # Match 'Reset in X seconds'
        m = re.search(r"reset\s+in\s+(\d+)\s*(?:seconds?|secs?|detik)", raw_input, re.IGNORECASE)
        if m:
            return int(m.group(1))

        # Match 'Reset in X minutes'
        m_min = re.search(r"reset\s+in\s+(\d+)\s*(?:minutes?|mins?|menit)", raw_input, re.IGNORECASE)
        if m_min:
            return int(m_min.group(1)) * 60

        # Match 'try again / retry in X seconds'
        m_retry = re.search(r"(?:try again|retry|coba lagi)\s*(?:in|after|dalam)\s*(\d+)\s*(?:seconds?|secs?|detik)", raw_input, re.IGNORECASE)
        if m_retry:
            return int(m_retry.group(1))

        # Match 'in / after / dalam X seconds'
        m_in_sec = re.search(r"(?:in|after|dalam)\s+(\d+)\s*(?:seconds?|secs?|detik)", raw_input, re.IGNORECASE)
        if m_in_sec:
            return int(m_in_sec.group(1))

        # Match 'in / after / dalam X minutes'
        m_in_min = re.search(r"(?:in|after|dalam)\s+(\d+)\s*(?:minutes?|mins?|menit)", raw_input, re.IGNORECASE)
        if m_in_min:
            return int(m_in_min.group(1)) * 60

    # 3. Check dict payload
    if isinstance(raw_input, dict):
        if "retry_after" in raw_input and isinstance(raw_input["retry_after"], (int, float)):
            return int(raw_input["retry_after"])
        if "reset_seconds" in raw_input and isinstance(raw_input["reset_seconds"], (int, float)):
            return int(raw_input["reset_seconds"])
        if "message" in raw_input and isinstance(raw_input["message"], str):
            return extract_rate_limit_seconds(raw_input["message"])

    return None


def humanize_rate_limit_message(msg: str, default_reset_seconds: Optional[int] = None) -> str:
    """
    Transform raw rate-limit error messages (especially from Lusha or external APIs)
    into clean, human-readable Indonesian messages with precise duration.

    Examples:
      'Daily API rate limit exceeded. Limit: 100 calls per day. Reset in 52927 seconds.'
      -> 'Batas kuota harian API Lusha tercapai (Limit: 100 panggilan/hari). Kuota akan di-reset dalam 14 jam 42 menit 7 detik.'

      'Reset in 19623 seconds.'
      -> 'Reset dalam 5 jam 27 menit 3 detik.'
    """
    if not msg:
        if default_reset_seconds is not None:
            return f"Batas pemanggilan API tercapai. Kuota akan di-reset dalam {format_duration_human(default_reset_seconds)}."
        return "Batas pemanggilan API tercapai. Silakan coba beberapa saat lagi."

    s = msg

    # Replace 'Reset in X seconds'
    s = re.sub(
        r"Reset in (\d+)\s*(?:seconds?|secs?|detik)\.?",
        lambda m: f"Reset dalam {format_duration_human(int(m.group(1)))}",
        s,
        flags=re.IGNORECASE,
    )

    # Replace 'Reset in X minutes'
    s = re.sub(
        r"Reset in (\d+)\s*(?:minutes?|mins?|menit)\.?",
        lambda m: f"Reset dalam {format_duration_human(int(m.group(1)) * 60)}",
        s,
        flags=re.IGNORECASE,
    )

    # Replace 'coba lagi/retry/try again in X seconds'
    s = re.sub(
        r"(coba lagi|try again|retry)\s*(?:in|after|dalam)\s*(\d+)\s*(?:seconds?|secs?|detik)\.?",
        lambda m: f"{m.group(1)} dalam {format_duration_human(int(m.group(2)))}",
        s,
        flags=re.IGNORECASE,
    )

    # Replace '(in/after/dalam) X seconds'
    s = re.sub(
        r"(?:in|after|dalam)\s+(\d+)\s*(?:seconds?|secs?|detik)\.?",
        lambda m: f"dalam {format_duration_human(int(m.group(1)))}",
        s,
        flags=re.IGNORECASE,
    )

    # Replace '(in/after/dalam) X minutes' when minutes >= 60
    def _repl_large_min(m: re.Match) -> str:
        mins = int(m.group(1))
        if mins >= 60:
            return f"dalam {format_duration_human(mins * 60)}"
        return m.group(0)

    s = re.sub(
        r"(?:in|after|dalam)\s+(\d+)\s*(?:minutes?|mins?|menit)\.?",
        _repl_large_min,
        s,
        flags=re.IGNORECASE,
    )

    # Translate standard Lusha messages to clean Indonesian
    s = re.sub(r"Daily API rate limit exceeded\.?", "Batas kuota harian API Lusha tercapai.", s, flags=re.IGNORECASE)
    s = re.sub(r"Limit:\s*(\d+)\s*calls per day\.?", r"Maksimal \1 panggilan per hari.", s, flags=re.IGNORECASE)

    # Clean up double periods or spaces
    s = re.sub(r"\s+", " ", s).strip()

    return s
