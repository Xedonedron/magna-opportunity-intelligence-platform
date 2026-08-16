"""FastAPI Router for AI Output, Thinking Process, and Link Verification."""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.ai_validation import ThinkingValidationRequest, ThinkingValidationResponse
from app.services.ai_validation_service import ai_validation_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["AI Validation"])


@router.post("/validate", response_model=ThinkingValidationResponse)
async def validate_ai_information_and_thinking(
    payload: ThinkingValidationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Validate AI generated information, reasoning/thinking trace consistency, and verify link validity.
    """
    try:
        result = await ai_validation_service.validate_information_and_thinking(
            request=payload,
            db=db,
        )
        return result
    except Exception as e:
        logger.error(f"[AIValidationRouter] Validation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Validation failed: {str(e)}",
        )