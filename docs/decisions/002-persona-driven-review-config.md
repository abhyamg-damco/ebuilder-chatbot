# ADR 002: Persona-driven defaults + per-chat overrides

**Status:** Accepted  
**Date:** 2026-07-18

## Context

Different reviewers need different rigor: auditors want tight thresholds; PMs want high-dollar exceptions only. Hard-coding one tolerance profile in the MCP server would not fit all users or use cases.

The one-pager calls for configurable “review style” and check toggles at session start.

## Decision

1. Introduce a **`Persona`** table per user with:
   - Natural-language **instructions** (prompt injection)
   - **defaultTolerances** (jsonb)
   - **defaultEnabledChecks** (jsonb)
2. Seed four starter personas on first API load.
3. At **chat creation**, show a setup form that:
   - Selects a persona
   - Copies persona defaults into editable fields
   - Persists the resolved config on `Chat.invoiceReviewConfig`
4. Provide **Settings → Review personas** CRUD UI mirroring agent skills.

Per-chat config is the source of truth for `evaluate_invoice_checks`; persona is the template, not a live link.

## Consequences

**Positive**

- Reusable review profiles without redeploying MCP.
- Session-specific overrides (e.g. one-off looser draw) without editing the persona.
- Familiar settings UX (list, create, edit, enable/disable, delete).

**Negative**

- Editing a persona does not retroactively change open chats.
- Duplicate tolerance/check UI in setup form and persona form (intentional parity).

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| Persona ID only on chat; resolve at runtime | Loses per-session overrides from the one-pager |
| Global org-level personas | Demo uses per-user scope like agent skills |
| Instructions only (no numeric defaults) | Checks need numeric thresholds |

## References

- `lib/personas/defaults.ts`, `lib/personas/types.ts`
- `components/chat/invoice-review-setup-form.tsx`
- `components/settings/persona-form.tsx`
- [features/personas.md](../features/personas.md)

![Persona settings](../images/review-personas-list.png)
