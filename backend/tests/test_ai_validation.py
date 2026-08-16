"""
Unit and integration tests for AI Validation & Thinking Pipeline (`/api/ai/validate`).
"""

import pytest
from app.services.ai_validation_service import AIValidationService
from app.services.link_verifier import LinkVerifierService
from app.schemas.ai_validation import AIValidationRequest


@pytest.mark.asyncio
async def test_link_validation_loop():
    """Verify link verification loop extracts and verifies links."""
    verifier = LinkVerifierService()
    text = "Find details at [Google](https://www.google.com) and [Fake](https://non-existent-fake-domain-123xyz.com/404)."

    result = await verifier.verify_and_loop_validation(
        text=text,
        max_loop=1,
        auto_strip_dead_links=True
    )

    assert result["total_checked"] >= 2
    assert "https://www.google.com" in result["valid_urls"]
    assert "https://non-existent-fake-domain-123xyz.com/404" in result["dead_urls"]
    assert "[Google](https://www.google.com)" in result["sanitized_text"]
    assert "[Fake]" not in result["sanitized_text"]


@pytest.mark.asyncio
async def test_ai_validation_service_direct():
    """Verify AIValidationService evaluates consistency and thinking flow."""
    service = AIValidationService()

    request = AIValidationRequest(
        content="PT Telkom Indonesia adalah perusahaan telekomunikasi terkemuka. Kunjungi https://www.google.com atau https://fake-domain-404-check.com.",
        context="Perusahaan telekomunikasi Indonesia.",
        thinking_process="1. Periksa nama perusahaan\n2. Cocokkan industri telekomunikasi\n3. Ambil URL referensi",
        validate_links=True,
        max_link_loops=1,
        auto_strip_dead_links=True
    )

    res = await service.validate(request)

    assert res.is_consistent is True
    assert res.confidence_score >= 0.0
    assert res.link_validation is not None
    assert res.link_validation.total_links_found >= 1
    assert "https://www.google.com" in res.link_validation.valid_links
    assert "https://fake-domain-404-check.com" in res.link_validation.dead_links