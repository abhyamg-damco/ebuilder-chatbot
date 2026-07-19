# ADR 003: Deterministic checks live in MCP, not the LLM

**Status:** Accepted  
**Date:** 2026-07-18

## Context

Invoice checks (over-billing vs SOV, retainage %, duplicate lines, math reconciliation) depend on precise numeric comparisons across many line items. LLMs are unreliable for repeatable arithmetic and threshold logic at scale.

## Decision

1. Implement checks as **pure TypeScript** in `ebuilder-agent-mcp/src/checks/evaluate.ts`.
2. Expose them via MCP tool **`evaluate_invoice_checks`** accepting:
   - Normalized `EvidencePack` from `assemble_invoice_evidence_pack`
   - `tolerances` and `enabledChecks` from chat config
3. Return structured **`ReviewFlag[]`** with codes, severities, dollar amounts, messages, and **citations**.
4. Add **unit tests** in `evaluate.test.ts` for regression safety.
5. Reserve **`PROGRESS`** and **`RFI_SCOPE`** as AI-assisted checks the agent may narrate using pack context only.

## Consequences

**Positive**

- Reproducible, testable outcomes for demo and audits.
- Same inputs → same deterministic flags.
- Agent focuses on orchestration and narrative, not math.

**Negative**

- Check logic changes require MCP deploy.
- AI-assisted checks lack the same test guarantees.

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| Prompt-only checks in the LLM | Non-deterministic; hard to demo consistently |
| Checks in the Next.js app | Duplicates logic; MCP already holds e-Builder normalization |
| Spreadsheet-style rules engine | Over-engineered for nine checks |

## References

- `ebuilder-agent-mcp/src/checks/evaluate.ts`
- `ebuilder-agent-mcp/src/checks/evaluate.test.ts`
- `ebuilder-agent-mcp/src/tools/evaluate-invoice-checks.ts`
