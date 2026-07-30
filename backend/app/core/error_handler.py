"""
Global error handling middleware for the MOIP API.

Catches all exceptions and returns structured JSON responses.
"""

import logging
from typing import Callable
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.exceptions import MOIPException

logger = logging.getLogger(__name__)


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """Middleware to catch and format all exceptions."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        try:
            return await call_next(request)
        except MOIPException as exc:
            logger.warning(
                f"MOIPException: {exc.code} - {exc.message}",
                extra={"details": exc.details, "path": request.url.path},
            )
            return JSONResponse(
                status_code=exc.status_code,
                content={
                    "success": False,
                    "error": {
                        "code": exc.code,
                        "message": exc.message,
                        "details": exc.details,
                    },
                },
            )
        except Exception as exc:
            logger.exception(
                f"Unhandled exception: {type(exc).__name__}: {exc}",
                extra={"path": request.url.path},
            )
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "error": {
                        "code": "INTERNAL_ERROR",
                        "message": "An unexpected error occurred",
                        "details": {},
                    },
                },
            )


def create_error_response(exc: MOIPException) -> dict:
    """Create a standardized error response dict."""
    return {
        "success": False,
        "error": {
            "code": exc.code,
            "message": exc.message,
            "details": exc.details,
        },
    }