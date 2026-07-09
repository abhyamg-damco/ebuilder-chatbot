/**
 * @file Browserbase session live-view URL resolver
 *
 * Fetches the embeddable iframe URL for a running cloud browser session.
 * The debug URL is not always available immediately after Stagehand init,
 * so this module retries briefly before failing.
 *
 * @see docs/architecture/browserbase-integration.md
 * @see docs/decisions/003-live-browser-panel.md
 */
import "server-only";

import { getBrowserbaseClient } from "./client";

/** How many times to poll sessions.debug before giving up. */
const LIVE_VIEW_RETRIES = 5;

/** Delay between poll attempts (ms). */
const LIVE_VIEW_RETRY_MS = 1_000;

/**
 * Resolves the fullscreen debugger URL for embedding in the browser panel iframe.
 *
 * @param sessionId - Browserbase session UUID from Stagehand.browserbaseSessionID.
 * @returns URL suitable for `<iframe src={url} />`.
 * @throws When the live-view URL is still unavailable after all retries.
 */
export async function getSessionLiveViewUrl(sessionId: string): Promise<string> {
  const client = getBrowserbaseClient();

  for (let attempt = 0; attempt < LIVE_VIEW_RETRIES; attempt += 1) {
    const urls = await client.sessions.debug(sessionId);

    if (urls.debuggerFullscreenUrl) {
      return urls.debuggerFullscreenUrl;
    }

    // Session may still be starting — wait and retry.
    await new Promise((resolve) => {
      setTimeout(resolve, LIVE_VIEW_RETRY_MS);
    });
  }

  throw new Error(`Live view URL not available for session ${sessionId}`);
}
