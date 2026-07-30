"""
Custom exception classes for the MOIP API.

Provides structured error responses with codes and details.
"""

from typing import Any, Optional


class MOIPException(Exception):
    """Base exception for all MOIP errors."""

    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_ERROR",
        status_code: int = 500,
        details: Optional[dict[str, Any]] = None,
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class NotFoundError(MOIPException):
    """Resource not found."""

    def __init__(self, resource: str, identifier: str):
        super().__init__(
            message=f"{resource} not found: {identifier}",
            code="NOT_FOUND",
            status_code=404,
            details={"resource": resource, "identifier": identifier},
        )


class ValidationError(MOIPException):
    """Validation error."""

    def __init__(self, message: str, field: Optional[str] = None):
        details = {"field": field} if field else {}
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            status_code=422,
            details=details,
        )


class UnauthorizedError(MOIPException):
    """Authentication required."""

    def __init__(self, message: str = "Authentication required"):
        super().__init__(
            message=message,
            code="UNAUTHORIZED",
            status_code=401,
        )


class ForbiddenError(MOIPException):
    """Permission denied."""

    def __init__(self, message: str = "Permission denied"):
        super().__init__(
            message=message,
            code="FORBIDDEN",
            status_code=403,
        )


class ConflictError(MOIPException):
    """Resource conflict."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="CONFLICT",
            status_code=409,
            details=details,
        )


class KYCPipelineError(MOIPException):
    """KYC pipeline failed."""

    def __init__(self, message: str, opportunity_id: Optional[str] = None):
        details = {"opportunity_id": opportunity_id} if opportunity_id else {}
        super().__init__(
            message=message,
            code="KYC_PIPELINE_ERROR",
            status_code=500,
            details=details,
        )


class ExternalServiceError(MOIPException):
    """External service unavailable."""

    def __init__(self, service: str, message: Optional[str] = None):
        super().__init__(
            message=message or f"{service} service unavailable",
            code="EXTERNAL_SERVICE_ERROR",
            status_code=503,
            details={"service": service},
        )


class RateLimitError(MOIPException):
    """Rate limit exceeded."""

    def __init__(self, retry_after: int = 60):
        super().__init__(
            message="Rate limit exceeded",
            code="RATE_LIMIT_EXCEEDED",
            status_code=429,
            details={"retry_after": retry_after},
        )