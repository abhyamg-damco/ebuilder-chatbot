# ADR 001: Dynamic Stagehand Loading

**Status:** Accepted  
**Date:** 2026-07-08

## Context

Stagehand (`@browserbasehq/stagehand`) depends on `ai@5`. This chatbot uses `ai@6` with `@ai-sdk/provider-utils@4.x`. A static top-level import of Stagehand in the chat API route caused Turbopack to bundle both AI SDK versions together, producing errors like:

```
Export lazyValidator doesn't exist in target module
```

## Decision

1. Load Stagehand via **dynamic `import()`** in `lib/browserbase/stagehand-loader.ts`.
2. Use **`import type { Stagehand }`** for TypeScript types only (erased at compile time).
3. Register **`serverExternalPackages`** in `next.config.ts` for `@browserbasehq/stagehand` and `@browserbasehq/sdk`.

## Consequences

**Positive**

- Chat route compiles without ai@5/ai@6 export conflicts.
- Stagehand loads from `node_modules` at runtime with its own dependency tree.

**Negative**

- Stagehand is not tree-shaken into the app bundle (acceptable — it's server-only).
- First browser tool call in a process pays a one-time dynamic import cost.

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| Force Stagehand to use ai@6 via pnpm override | Stagehand is built/tested against ai@5; high breakage risk |
| Separate microservice for browser automation | Operational overhead for this integration |
| Drop Stagehand, use raw Playwright + Browserbase CDP | Loses natural-language act/extract/agent primitives |

## References

- `lib/browserbase/stagehand-loader.ts`
- `next.config.ts` → `serverExternalPackages`
