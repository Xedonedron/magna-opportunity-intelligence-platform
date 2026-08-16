"""Pydantic schemas for AI Information & Thinking Validation endpoint."""

from typing import Any, Optional
from pydantic import BaseModel, Field


class LinkValidationItem(BaseModel):
    url: str
    is_valid: bool
    status_code: Optional[int] = None
    error: Optional[str] = None


class ThinkingValidationRequest(BaseModel):
    information: str = Field(..., description="The final information or output text to validate")
    thinking_process: Optional[str] = Field(None, description="The internal thinking or reasoning chain to validate")
    context: Optional[str] = Field(None, description="Original reference context, ground truth, or prompt")
    check_links: bool = Field(True, description="Whether to verify all links present in information")


class ValidationIssue(BaseModel):
    category: str = Field(..., description="Category of issue: hallucination, inconsistency, broken_link, logical_fallacy")
    description: str = Field(..., description="Detailed description of the discrepancy or error")
    severity: str = Field("medium", description="high, medium, low")


class ThinkingValidationResponse(BaseModel):
    is_consistent: bool = Field(..., description="True if output matches thinking process and ground truth")
    consistency_score: float = Field(..., description="Consistency & grounding score from 0.0 to 1.0")
    feedback: str = Field(..., description="Summary feedback and critique of the output and thinking process")
    issues: list[ValidationIssue] = Field(default_factory=list, description="Identified issues or discrepancies")
    links_validation: list[LinkValidationItem] = Field(default_factory=list, description="Validation results for extracted links")
    sanitized_information: Optional[str] = Field(None, description="Cleaned information with broken/dead links removed")