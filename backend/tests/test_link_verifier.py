"""
Unit tests for LinkVerifierService (Anti-Hallucination & Live Link Verification Engine).
"""

import pytest
from app.services.link_verifier import LinkVerifierService, link_verifier_service


@pytest.mark.asyncio
async def test_valid_url_syntax_check():
    """Verify syntactic URL validation helper."""
    verifier = LinkVerifierService()

    assert verifier.is_valid_url_format("https://cloud.google.com/bigquery") is True
    assert verifier.is_valid_url_format("http://example.com") is True
    assert verifier.is_valid_url_format("invalid_url_string") is False
    assert verifier.is_valid_url_format("ftp://invalid-scheme.com") is False
    assert verifier.is_valid_url_format("") is False
    assert verifier.is_valid_url_format(None) is False


@pytest.mark.asyncio
async def test_is_url_alive_real_domain():
    """Verify live HTTP check for an established active website."""
    is_live = await link_verifier_service.is_url_alive("https://cloud.google.com", timeout=3.0)
    assert is_live is True


@pytest.mark.asyncio
async def test_is_url_alive_ghost_domain():
    """Verify live HTTP check returns False for non-existent / ghost URL."""
    is_live = await link_verifier_service.is_url_alive("https://this-is-a-completely-fake-ghost-domain-12345.com/page404", timeout=2.0)
    assert is_live is False


@pytest.mark.asyncio
async def test_sanitize_references_and_sources():
    """Verify filtering out hallucinated/dead links from references."""
    references = [
        {"title": "Google Cloud", "url": "https://cloud.google.com"},
        {"title": "Ghost Link", "url": "https://fake-ghoib-domain-999.com/notfound"},
    ]

    verified = await link_verifier_service.sanitize_references_and_sources(references, timeout=2.0)
    assert len(verified) == 1
    assert verified[0]["title"] == "Google Cloud"
    assert verified[0]["verified"] is True


def test_strip_dead_markdown_links():
    """Verify stripping dead hyperlinks while retaining text label."""
    verifier = LinkVerifierService()
    valid_urls = {"https://cloud.google.com"}

    raw_text = "Check [Google Cloud](https://cloud.google.com) and [Fake Site](https://deadlink.com)."
    cleaned = verifier.strip_dead_markdown_links(raw_text, valid_urls)

    assert "[Google Cloud](https://cloud.google.com)" in cleaned
    assert "[Fake Site]" not in cleaned
    assert "Fake Site" in cleaned
