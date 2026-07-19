# ADR 005: Structured output via advisory-brief artifact

**Status:** Accepted  
**Date:** 2026-07-18

## Context

Free-form chat responses are hard to scan for severity, dollar impact, and audit citations. Reviewers need a consistent brief comparable across sessions and personas.

The chatbot already supports document artifacts (code, sheet, text) with panel rendering.

## Decision

1. Add document kind **`advisory-brief`** to the schema and artifact registry.
2. Define **`AdvisoryBriefContent`** JSON schema in `lib/invoice-review/types.ts`:
   - Risk rating, title, optional invoice metadata
   - Contract summary block
   - Flags with code, severity, amount, message, citations
   - Passed checks list
   - Recommendation string
3. Extend **`createDocument`** to accept optional `content` for pre-structured advisory briefs.
4. Render in **`artifacts/advisory-brief/client.tsx`** with severity styling and citation lists.

The agent must call `createDocument` after MCP evaluation, not only summarize in prose.

## Consequences

**Positive**

- Shareable, persistent review output tied to the chat.
- Aligns with existing artifact UX (open panel, scroll flags).
- JSON schema enables future export (PDF, email) without prompt changes.

**Negative**

- Agent must produce valid JSON; malformed content needs client fallbacks.
- Another artifact kind to maintain alongside code/sheet/text.

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| Markdown-only response | Weak structure for severity and $ sorting |
| New database table for reviews | Artifacts already persist documents |
| Inline tables in chat | Poor UX for long flag lists |

## References

- `artifacts/advisory-brief/server.ts`, `client.tsx`
- `lib/invoice-review/types.ts` → `AdvisoryBriefContent`
- `lib/ai/tools/create-document.ts`

![Workflow ending in advisory brief](../images/invoice-review-workflow.png)
