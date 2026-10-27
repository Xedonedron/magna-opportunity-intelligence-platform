"""Canonical opportunity pipeline statuses and legacy data migration helpers."""

from __future__ import annotations

from typing import Final


OPPORTUNITY_STATUSES: Final[tuple[str, ...]] = (
    "Research Only",
    "Lead In",
    "Contact Made",
    "Needs Defined",
    "Prospect Qualified",
    "Proposal Made",
    "Closed Won",
    "Closed Lost",
    "Hold",
)

DEFAULT_OPPORTUNITY_STATUS: Final[str] = "Lead In"
KYC_RUNNING_STATUS: Final[str] = "Research Only"
KYC_COMPLETED_STATUS: Final[str] = "Prospect Qualified"
TERMINAL_OPPORTUNITY_STATUSES: Final[tuple[str, ...]] = (
    "Closed Won",
    "Closed Lost",
    "Hold",
)

# This mapping is also used by the Alembic data migration. Keep it explicit so
# imported or manually created legacy records can be normalized consistently.
LEGACY_STATUS_MAPPING: Final[dict[str, str]] = {
    "New": "Lead In",
    "KYC Running": "Research Only",
    "Ready Meeting": "Prospect Qualified",
    "Meeting Scheduled": "Contact Made",
    "Meeting Done": "Needs Defined",
    "Need Proposal": "Proposal Made",
    "POC": "Proposal Made",
    "Negotiation": "Proposal Made",
    "PO": "Closed Won",
    "Won": "Closed Won",
    "Lost": "Closed Lost",
    "On Hold": "Hold",
    "Need Follow Up": "Needs Defined",
    "Closed": "Closed Won",
    "Cancelled": "Closed Lost",
}


def normalize_legacy_status(status: str | None) -> str | None:
    """Return the new pipeline status for a legacy status, if one exists."""

    return LEGACY_STATUS_MAPPING.get(status, status)
