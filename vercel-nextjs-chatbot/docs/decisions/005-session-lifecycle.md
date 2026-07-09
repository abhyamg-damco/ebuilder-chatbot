# ADR 005: Browser Session Lifecycle

**Status:** Accepted  
**Date:** 2026-07-08

## Context

Multiple browser tools may run in one chat turn (navigate → act → extract). Each should share one cloud Chrome session and one live-view panel. Sessions must also be cleaned up to avoid orphaned Browserbase charges.

## Decision

### In-memory store (`session-store.ts`)

- Key: `chatId` (UUID of the conversation).
- Value: `{ stagehand, sessionId, liveViewUrl }`.
- Scope: **one API request** in memory; cloud session persists via Browserbase `keepAlive`.

### Lifecycle

```
First live-browser tool call
  → createStagehandInstance({ keepAlive: true })
  → stagehand.init()
  → emit data-browserSession { status: "running" }
  → cache in activeSessions Map

Subsequent tool calls (same request)
  → activeSessions.get(chatId) — reuse

streamText onFinish (agent turn complete)
  → releaseBrowserSession(chatId) — disconnect Stagehand, cloud browser stays alive
  → DB status remains "running" — user can still use live view

Follow-up user message
  → getOrCreateBrowserSession reconnects via browserbaseSessionID

closeBrowser tool
  → REQUEST_RELEASE on Browserbase API
  → endBrowserSessionRecord + emit { status: "ended" }

Idle timeout (user-configurable in Platform settings, default 2 minutes)
  → releaseBrowserSession schedules after() callback
  → client hook also calls POST /api/browserbase/close
  → stale sessions are not reconnected on the next message
```

`releaseBrowserSession` on `onFinish` keeps the browser available when the agent pauses for OTP or other chat input.

### Stagehand cache

`cacheDir` is `.stagehand-cache` locally and `/tmp/stagehand-cache` on Vercel so observe→act replay persists across runs within the same environment.

## Consequences

**Positive**

- One live view per chat turn; smooth multi-step agent flows.
- Automatic cleanup on stream end.

**Negative**

- Cloud sessions with `keepAlive` must be explicitly closed via `closeBrowser` to avoid ongoing Browserbase charges.
- Reconnect depends on Browserbase session still being within its timeout window.

## Future options

- Use Browserbase Contexts for cookie/auth persistence across sessions.

## References

- `lib/browserbase/session-store.ts`
- `app/(chat)/api/chat/route.ts` → `onFinish` → `releaseBrowserSession`
