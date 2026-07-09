# Browserbase Integration Architecture

This document describes how cloud browser automation is wired into the chatbot.

## Overview

The chat agent can browse the web via [Browserbase](https://browserbase.com) using three capability layers:

| Layer | Package | Starts live browser? | Opens right panel? |
|-------|---------|---------------------|------------------|
| Search | `@browserbasehq/sdk` | No | No |
| Fetch | `@browserbasehq/sdk` | No | No |
| Live browser | `@browserbasehq/stagehand` | Yes | Yes |

Only **live-browser tools** open the right-hand `BrowserPanel` iframe.

## Component diagram

```
User message
    │
    ▼
POST /api/chat (route.ts)
    │
    ├─ streamText({ tools: { webSearch, fetchWebPage, ...browserTools } })
    │
    ├─ Tier 1 (SDK only)
    │     webSearch  ──► client.search.web()
    │     fetchWebPage ──► client.fetchAPI.create()
    │
    └─ Tier 2 (Stagehand + session-store)
          browserNavigate / browserAct / browserExtract / browserAgent
          browserSearchAndOpen / browserSearchOpenAndSummarize
          browserSyncUploads / browserAttachFile
                │
                ├─ getOrCreateBrowserSession(chatId, dataStream)
                │       ├─ createStagehandInstance()  [dynamic import]
                │       ├─ stagehand.init()
                │       ├─ getSessionLiveViewUrl()
                │       └─ dataStream.write({ type: "data-browserSession" })
                │
                ▼
          SSE stream ──► DataStreamHandler ──► useBrowserPanel
                │
                ▼
          BrowserPanel (iframe: debuggerFullscreenUrl)
```

## Key files

### Server (`lib/browserbase/`)

| File | Responsibility |
|------|----------------|
| `config.ts` | Env flags, model ID, cache path, feature gate |
| `client.ts` | Singleton Browserbase SDK client (Search/Fetch/debug) |
| `stagehand-loader.ts` | Dynamic import of Stagehand (ai@5 isolation) |
| `session-store.ts` | Per-chat in-memory session + SSE events |
| `session-uploads.ts` | GCS → Browserbase session file sync + CDP attach |
| `live-view.ts` | Resolves embeddable iframe URL with retries |

### AI tools (`lib/ai/tools/`)

| File | Responsibility |
|------|----------------|
| `web-search.ts` | Tier-1 search tool |
| `fetch-web-page.ts` | Tier-1 silent fetch tool |
| `create-browser-tools.ts` | Factory for all Tier-2 live-browser tools (incl. `browserSyncUploads`, `browserAttachFile`) |

### File uploads (chat → cloud browser)

```
User checks "Use in browser" on attachment
    │
    ▼
ChatUpload.metadata.useInBrowser = true
    │
    ▼
browserSyncUploads tool
    ├─ downloadFromGcs(buffer)
    ├─ client.sessions.uploads.create(sessionId, { file })
    └─ file at /tmp/.uploads/{filename}
    │
    ▼
browserAttachFile(uploadId, selector)
    └─ page.sendCDP("DOM.setFileInputFiles")  [remote path in cloud browser]
```

**Important:** Attach uses Stagehand understudy `Page.sendCDP()`, not Playwright `setInputFiles()`. Playwright file paths are resolved on the app server; Browserbase session files live at `/tmp/.uploads/{name}` inside the remote VM.

**UI:** `PreviewAttachment` shows a **Use in browser** checkbox when `GET /api/browserbase/status` reports `enabled: true`. Flag is stored on `ChatUpload.metadata.useInBrowser`.

**Test page:** [browser-tests-alpha upload test](https://browser-tests-alpha.vercel.app/api/upload-test) — selector `#fileUpload`.

### Client UI

| File | Responsibility |
|------|----------------|
| `hooks/use-browser-panel.ts` | SWR state for panel visibility |
| `hooks/use-browserbase-enabled.ts` | Gates "Use in browser" checkbox on attachments |
| `components/chat/preview-attachment.tsx` | Attachment preview + browser flag toggle |
| `components/chat/browser-panel.tsx` | Live-view iframe (60% right column) |
| `components/chat/data-stream-handler.tsx` | Handles `data-browserSession` events |
| `components/chat/shell.tsx` | Shows BrowserPanel OR Artifact panel |

### API

| Route | Responsibility |
|-------|----------------|
| `app/(chat)/api/chat/route.ts` | Registers tools, browse-intent prompt, session cleanup |
| `app/(chat)/api/browserbase/live-view/route.ts` | Auth-gated live-view URL poll endpoint |
| `app/(chat)/api/browserbase/status/route.ts` | Feature flag for attachment UI |

## Configuration

```env
BROWSERBASE_API_KEY=bb_live_...
```

No `BROWSERBASE_PROJECT_ID` is required — the API key resolves the project automatically.

## Related docs

- [Decision: Dynamic Stagehand loading](../decisions/001-dynamic-stagehand-loading.md)
- [Decision: AI SDK dependency isolation](../decisions/002-ai-sdk-dependency-isolation.md)
- [Decision: Live browser panel](../decisions/003-live-browser-panel.md)
- [Decision: Browser tool tiering](../decisions/004-browser-tool-tiering.md)
- [Decision: Session lifecycle](../decisions/005-session-lifecycle.md)
- [Decision: Browser session file uploads](../decisions/006-browser-session-file-uploads.md)
