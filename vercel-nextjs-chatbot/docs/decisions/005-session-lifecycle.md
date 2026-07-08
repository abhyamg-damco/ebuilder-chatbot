# ADR 005: Browser Session Lifecycle

**Status:** Accepted  
**Date:** 2026-07-08

## Context

Multiple browser tools may run in one chat turn (navigate → act → extract). Each should share one cloud Chrome session and one live-view panel. Sessions must also be cleaned up to avoid orphaned Browserbase charges.

## Decision

### In-memory store (`session-store.ts`)

- Key: `chatId` (UUID of the conversation).
- Value: `{ stagehand, sessionId, liveViewUrl }`.
- Scope: **single API request** (one `streamText` invocation). Not shared across follow-up user messages on serverless.

### Lifecycle

```
First live-browser tool call
  → createStagehandInstance()
  → stagehand.init()
  → emit data-browserSession { status: "running" }
  → cache in activeSessions Map

Subsequent tool calls (same request)
  → activeSessions.get(chatId) — reuse

closeBrowser tool OR streamText onFinish
  → stagehand.close()
  → activeSessions.delete(chatId)
  → optionally emit { status: "ended" }
```

`closeAllBrowserSessions()` in `onFinish` is a safety net if the agent forgets `closeBrowser`.

### Stagehand cache

`cacheDir` is `.stagehand-cache` locally and `/tmp/stagehand-cache` on Vercel so observe→act replay persists across runs within the same environment.

## Consequences

**Positive**

- One live view per chat turn; smooth multi-step agent flows.
- Automatic cleanup on stream end.

**Negative**

- **No cross-message session persistence** on Vercel serverless (new request = new process). Follow-up messages start a fresh browser unless we add Redis/external session reconnection later.

## Future options

- Store `sessionId` in Redis keyed by `chatId` for reconnect via Browserbase CDP.
- Use Browserbase Contexts for cookie/auth persistence across sessions.

## References

- `lib/browserbase/session-store.ts`
- `app/(chat)/api/chat/route.ts` → `onFinish` → `closeAllBrowserSessions`
