# ADR 004: Browser Tool Tiering

**Status:** Accepted  
**Date:** 2026-07-08

## Context

The model initially answered "search, open, and summarize" prompts using `webSearch` + `fetchWebPage` — fast but invisible to the user. We need clear tiers so the agent picks the right capability and opens the live panel when appropriate.

## Decision

### Tier 1 — No live browser (SDK only)

| Tool | API | Use when |
|------|-----|----------|
| `webSearch` | `client.search.web` | Find URLs; user did not ask to open/watch |
| `fetchWebPage` | `client.fetchAPI.create` | Silent background read; user did not ask to open/watch |

### Tier 2 — Live browser (Stagehand + session-store)

| Tool | Use when |
|------|----------|
| `browserSearchOpenAndSummarize` | Search + open + summarize in one call (preferred) |
| `browserSearchAndOpen` | Search + open without summarize |
| `browserNavigate` | Open a known URL |
| `browserAct` | Single click/type/scroll (observe→act) |
| `browserExtract` | Pull structured data from current page |
| `browserAgent` | Multi-step forms, uploads, complex flows |
| `closeBrowser` | End session |

### Prompt enforcement

1. `browserToolsPrompt` in system message when tools are enabled.
2. `browseIntentPrompt` appended when `hasBrowseIntent()` matches open/browse/visit/watch.
3. Tool descriptions explicitly forbid `fetchWebPage` for live-browse requests.

## Consequences

**Positive**

- Combined tools (`browserSearchOpenAndSummarize`) reduce model shortcutting.
- Clear separation between silent reads and visible browsing.

**Negative**

- More tools in the registry → slightly higher model selection complexity.
- Model may still choose Tier 1; mitigated by prompts + combined tools.

## References

- `lib/ai/tools/web-search.ts`
- `lib/ai/tools/fetch-web-page.ts`
- `lib/ai/tools/create-browser-tools.ts`
- `lib/ai/prompts.ts` → `browserToolsPrompt`, `hasBrowseIntent`
