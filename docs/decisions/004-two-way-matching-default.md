# ADR 004: Two-way matching as the default scope

**Status:** Accepted  
**Date:** 2026-07-18

## Context

Invoice matching can mean:

- **Two-way** — invoice lines vs contract / SOV / approved change orders
- **Three-way** — also verify stored materials, delivery receipts, or field verification

Three-way matching requires additional e-Builder entities and field mappings not confirmed for this tenant demo.

## Decision

1. Default checks compare invoice billing to **contract value, SOV lines, approved COs, and prior approved draws**.
2. **Do not** implement stored-materials or receipt verification in v1.
3. Document this limit in the system prompt and architecture docs.
4. Use **lenient smart defaults** for tolerances (derived from commitment `CostControlTolerancePercent` where available, else static defaults in `defaults.ts`).

## Consequences

**Positive**

- Achievable demo with existing CommitmentInvoices / Commitments / CO APIs.
- Clear scope boundary for stakeholders.

**Negative**

- Cannot catch certain field-verification fraud patterns.
- `DUPLICATE` check uses heuristics on invoice/prior data, not warehouse receipts.

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| Full three-way matching | Missing data model / API coverage in demo |
| Invoice-only (no SOV) | Too weak for construction draw review story |
| User-selectable matching mode | Added UX complexity; deferred |

## References

- `ebuilder-agent-mcp/src/checks/evaluate.ts` → `checkOverBilling`, `checkCoUnapproved`
- `lib/invoice-review/prompts.ts` — “Two-way matching only”
- `docs/resources/ebuilder-invoice-advisor-onepager.pdf`
