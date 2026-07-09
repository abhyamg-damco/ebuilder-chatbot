# ADR 002: AI SDK Dependency Isolation

**Status:** Accepted  
**Date:** 2026-07-08

## Context

The chatbot pins AI SDK packages for its own `ai@6` stack:

```json
"pnpm": {
  "overrides": {
    "@ai-sdk/provider": "3.0.10",
    "@ai-sdk/openai": "3.0.74",
    "ai@6>@ai-sdk/provider-utils": "4.0.30",
    "ai@6>@ai-sdk/gateway": "3.0.66"
  }
}
```

A **global** `@ai-sdk/provider-utils` override previously forced `4.0.30` onto Stagehand's `ai@5` subtree, which expects `3.0.28`. This broke Stagehand at runtime even after fixing the bundle issue.

## Decision

Scope pnpm overrides **by major ai version**:

```json
"ai@5>@ai-sdk/provider-utils": "3.0.28",
"ai@5>@ai-sdk/provider": "2.0.3",
"ai@5>@ai-sdk/gateway": "2.0.109",
"ai@6>@ai-sdk/provider-utils": "4.0.30",
"ai@6>@ai-sdk/gateway": "3.0.66"
```

Do **not** use a flat `"@ai-sdk/provider-utils": "4.0.30"` override.

## Consequences

**Positive**

- Chatbot and Stagehand each resolve compatible provider-utils versions.
- `node -e "import('@browserbasehq/stagehand')"` succeeds without export errors.

**Negative**

- Override rules must be maintained when upgrading `ai` or `@browserbasehq/stagehand`.

## Verification

```bash
pnpm why @ai-sdk/provider-utils   # should show both 3.0.28 (ai@5) and 4.0.30 (ai@6)
node -e "import('@browserbasehq/stagehand').then(() => console.log('OK'))"
```

## References

- `package.json` → `pnpm.overrides`
