# ADR 003: Live Browser Panel (Right-Hand Side)

**Status:** Accepted  
**Date:** 2026-07-08

## Context

Users expect to **watch** the agent browse in real time when they say "open a page." Silent `fetchWebPage` calls do not surface any UI. The existing artifact panel is document-centric (text/code/sheet) and not suited to ephemeral iframe sessions.

## Decision

Add a dedicated **BrowserPanel** in the right 60% column, separate from artifacts:

1. **Server** emits `data-browserSession` SSE events from `session-store.ts` when a live session starts.
2. **DataStreamHandler** updates `useBrowserPanel` SWR state on `data-browserSession`.
3. **BrowserPanel** embeds `debuggerFullscreenUrl` from Browserbase in an iframe.
4. **shell.tsx** shows `BrowserPanel` when `isBrowserPanelVisible`, otherwise `Artifact`.
5. **GET /api/browserbase/live-view** provides an auth-gated poll fallback for the embed URL.

Panel opens when `status: "running"` is received — not on Search/Fetch alone.

## Data contract

```typescript
// lib/types.ts → CustomUIDataTypes.browserSession
{
  sessionId: string;
  liveViewUrl?: string;
  status: "running" | "ended";
  title?: string;
}
```

## Consequences

**Positive**

- User sees live cloud Chrome while the agent works.
- API key stays server-side; client only gets the embed URL.
- Disconnect handled via `browserbase-disconnected` postMessage.

**Negative**

- Only one right panel at a time (browser OR artifact, not both).
- Sessions are not persisted across separate HTTP requests (see ADR 005).

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| New artifact kind `"browser"` | Artifacts are DB-versioned documents; browser sessions are ephemeral |
| Link-only (no iframe) | Poor UX; user asked for live view on the right |
| Open Browserbase dashboard in new tab | Breaks in-chat flow |

## References

- `components/chat/browser-panel.tsx`
- `hooks/use-browser-panel.ts`
- `lib/browserbase/session-store.ts` → `emitBrowserSessionEvent`
