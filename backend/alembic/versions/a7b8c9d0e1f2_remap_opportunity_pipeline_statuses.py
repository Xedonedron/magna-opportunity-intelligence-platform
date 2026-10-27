"""Remap opportunity statuses to the revised sales pipeline.

Revision ID: a7b8c9d0e1f2
Revises: c3d4e5f6a7b8
Create Date: 2026-10-27

The mapping is intentionally many-to-one, so it cannot be reversed without
losing information. The downgrade is therefore a no-op rather than guessing
which legacy status a merged stage originally represented.
"""

from typing import Sequence, Union

from alembic import op


revision: str = "a7b8c9d0e1f2"
down_revision: Union[str, None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # CASE is idempotent: already-remapped records are not included in the
    # legacy value list and will be left untouched on a re-run.
    op.execute(
        """
        UPDATE opportunities
        SET status = CASE status
            WHEN 'New' THEN 'Lead In'
            WHEN 'KYC Running' THEN 'Research Only'
            WHEN 'Ready Meeting' THEN 'Prospect Qualified'
            WHEN 'Meeting Scheduled' THEN 'Contact Made'
            WHEN 'Meeting Done' THEN 'Needs Defined'
            WHEN 'Need Proposal' THEN 'Proposal Made'
            WHEN 'POC' THEN 'Proposal Made'
            WHEN 'Negotiation' THEN 'Proposal Made'
            WHEN 'PO' THEN 'Closed Won'
            WHEN 'Won' THEN 'Closed Won'
            WHEN 'Lost' THEN 'Closed Lost'
            WHEN 'On Hold' THEN 'Hold'
            WHEN 'Need Follow Up' THEN 'Needs Defined'
            WHEN 'Closed' THEN 'Closed Won'
            WHEN 'Cancelled' THEN 'Closed Lost'
            ELSE status
        END
        WHERE status IN (
            'New', 'KYC Running', 'Ready Meeting', 'Meeting Scheduled',
            'Meeting Done', 'Need Proposal', 'POC', 'Negotiation', 'PO',
            'Won', 'Lost', 'On Hold', 'Need Follow Up', 'Closed', 'Cancelled'
        )
        """
    )


def downgrade() -> None:
    # The upgrade intentionally merges multiple legacy statuses into one new
    # status. Reverting would silently invent a status, so preserve the data.
    pass
