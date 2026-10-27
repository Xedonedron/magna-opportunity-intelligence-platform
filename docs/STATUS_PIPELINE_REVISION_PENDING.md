# Pending Opportunity Status Revision

> **Status: parked / not active.** The current MOIP implementation remains on
> the existing status pipeline until the revised mapping is confirmed by the
> senior/requestor.

## Proposed statuses

1. Research Only
2. Lead In
3. Contact Made
4. Needs Defined
5. Prospect Qualified
6. Proposal Made
7. Closed Won
8. Closed Lost
9. Hold

## Proposed legacy mapping — pending confirmation

| Existing status | Proposed status | Notes |
|---|---|---|
| New | Lead In | Straightforward |
| KYC Running | Research Only | Confirm that this means active research only |
| Ready Meeting | Prospect Qualified | Straightforward |
| Meeting Scheduled | Contact Made | Confirm whether this belongs in Contact Made or Needs Defined |
| Meeting Done | Needs Defined | Confirm business meaning |
| Need Proposal | Proposal Made | Many-to-one merge |
| POC | Proposal Made | Many-to-one merge |
| Negotiation | Proposal Made | Many-to-one merge |
| PO | Closed Won | Confirm that PO is already considered won |
| Won | Closed Won | Straightforward |
| Lost | Closed Lost | Straightforward |
| Cancelled | Closed Lost | Confirm if cancellation should be separated |
| On Hold | Hold | Straightforward |

## Production snapshot captured read-only on 2026-10-27

- Ready Meeting: 45
- Meeting Done: 2
- Need Proposal: 2
- PO: 1

The implementation should only be reapplied after the mapping above is
confirmed, because several old statuses merge into one new status and cannot be
recovered automatically after migration.
