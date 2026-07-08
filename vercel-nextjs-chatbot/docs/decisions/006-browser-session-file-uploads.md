# ADR 006: Browser Session File Uploads

**Status:** Accepted  
**Date:** 2026-07-08

## Context

Users attach documents in chat (stored in GCS). When the agent fills a website file input in a remote Browserbase session, the cloud browser cannot access GCS signed URLs or the user's local filesystem.

Browserbase provides a [Session Uploads API](https://docs.browserbase.com/platform/browser/files/uploads) that places files at `/tmp/.uploads/{filename}` inside the remote session. Attaching to `<input type="file">` requires CDP `DOM.setFileInputFiles` with that remote path.

## Decision

### User intent: "Use in browser" checkbox

- Shown on attachment previews when `BROWSERBASE_API_KEY` is configured.
- Persisted as `ChatUpload.metadata.useInBrowser` when the message is sent.
- Only flagged files are synced — not every chat upload.

### Sync + attach tools

| Tool | Role |
|------|------|
| `browserSyncUploads` | Download from GCS → `sessions.uploads.create` → track remote path |
| `browserAttachFile` | Attach synced file to a file input via CDP on the current page |

### CDP attach (Stagehand v3)

Stagehand v3 uses an understudy `Page` with `sendCDP()`, not Playwright's `BrowserContext.newCDPSession()`.

`browserAttachFile` must call CDP on the **remote** browser session:

1. `DOM.enable`
2. `DOM.getDocument` → `DOM.querySelector` (CSS selector, e.g. `#fileUpload`)
3. `DOM.setFileInputFiles` with path `/tmp/.uploads/{filename}`

**Do not** use Playwright `setInputFiles(remotePath)` when connected over CDP to Browserbase — that resolves paths on the **server** (Vercel), not inside the cloud browser, and fails with `file not found` even when sync succeeded.

Remote path must match the `File.name` sent to `sessions.uploads.create` (see `uploadToBrowserSession` in `session-uploads.ts`).

### Service layer

`lib/browserbase/session-uploads.ts` centralizes:
- GCS download
- Browserbase upload API
- In-memory `syncedFiles` map on `ActiveBrowserSession`
- Durable sync metadata on `ChatUpload` (`browserRemotePath`, `browserSyncedSessionId`)

### Agent workflow

```
browserNavigate → browserSyncUploads → browserAttachFile → browserAct / browserAgent
```

Do **not** pass signed GCS URLs to `browserAgent` for file inputs.

## Consequences

- Extra API call per flagged file on first browser use per session.
- Filenames are sanitized; collisions get an upload-id prefix.
- Live View manual upload remains a fallback if CDP attach fails.

## Testing

Official Browserbase upload test page:

**https://browser-tests-alpha.vercel.app/api/upload-test** (selector: `#fileUpload`)

1. Attach a file in chat and check **Use in browser**.
2. Prompt example: *Open https://browser-tests-alpha.vercel.app/api/upload-test in the live browser, sync my browser file, attach it to #fileUpload, and confirm the filename on the page.*

Expected tool chain: `browserNavigate` → `browserSyncUploads` → `browserAttachFile`.

## Related

- [Browserbase uploads docs](https://docs.browserbase.com/platform/browser/files/uploads)
- [Architecture: browserbase-integration.md](../architecture/browserbase-integration.md)
