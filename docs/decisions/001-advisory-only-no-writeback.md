# ADR 001: Advisory-only — no write-back to e-Builder

**Status:** Accepted  
**Date:** 2026-07-18

## Context

Construction invoice approval in e-Builder is a controlled workflow with audit requirements. An AI copilot that could approve, return, or post adjustments would need strong authorization, idempotency, and liability controls beyond this demo scope.

The product one-pager positions the feature as an **advisory** assistant for reviewers, not an autonomous approver.

## Decision

1. Invoice Review Advisor sessions are **read-only** toward e-Builder.
2. The system prompt explicitly forbids approve/return/write-back actions.
3. MCP tools for this feature are limited to **query + evaluate** (`assemble_invoice_evidence_pack`, `evaluate_invoice_checks`).
4. Final output is an **Advisory Brief** artifact for human action outside the chatbot.

## Consequences

**Positive**

- Lower security and compliance risk for the demo.
- Clear human-in-the-loop boundary.
- Simpler MCP surface (no mutation endpoints).

**Negative**

- Reviewer must manually act in e-Builder after reading the brief.
- No closed-loop “fix and resubmit” automation in v1.

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| Approve/return via Unity API | Requires role mapping, audit trail, and error handling not in demo scope |
| Draft comments only (write comments, not status) | Still a write path; deferred |
| Full autonomous approval | Unacceptable for construction draws without governance |

## References

- [architecture/invoice-review-advisor.md](../architecture/invoice-review-advisor.md)
- `lib/invoice-review/prompts.ts`
- `docs/resources/ebuilder-invoice-advisor-onepager.pdf`
