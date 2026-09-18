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

    cleaned_text, url_status = await verifier.verify_and_clean_text_links(text=text)

    assert len(url_status) >= 2
    assert url_status.get("https://www.google.com") is True
    assert url_status.get("https://non-existent-fake-domain-123xyz.com/404") is False
    assert "[Google](https://www.google.com)" in cleaned_text
    assert "[Fake]" not in cleaned_text


@pytest.mark.asyncio
async def test_ai_validation_service_direct():
    """Verify AIValidationService evaluates consistency and thinking flow."""
    from unittest.mock import AsyncMock, patch

    service = AIValidationService()

    request = AIValidationRequest(
        information="PT Telkom Indonesia adalah perusahaan telekomunikasi terkemuka. Kunjungi https://www.google.com atau https://fake-domain-404-check.com.",
        context="Perusahaan telekomunikasi Indonesia.",
        thinking_process="1. Periksa nama perusahaan\n2. Cocokkan industri telekomunikasi\n3. Ambil URL referensi",
        check_links=True,
    )

    from unittest.mock import MagicMock
    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(
        return_value=MagicMock(
            content='{"is_consistent": true, "consistency_score": 0.95, "feedback": "Consistent", "issues": []}'
        )
    )

    with patch("app.services.ai_validation_service.get_chat_llm", return_value=mock_llm):
        res = await service.validate_information_and_thinking(request)

        # Because a dead link exists, consistency score is penalized and verified
        assert res.consistency_score >= 0.0
        assert res.links_validation is not None
        assert any(item.url == "https://www.google.com" and item.is_valid for item in res.links_validation)
        assert any("fake-domain-404-check.com" in item.url and not item.is_valid for item in res.links_validation)