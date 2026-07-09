/**
 * @file Browserbase SDK client singleton
 *
 * Provides a shared {@link Browserbase} client for stateless APIs:
 * - Search (`client.search.web`) — find URLs without spinning up a browser
 * - Fetch (`client.fetchAPI.create`) — read page HTML without a browser session
 * - Sessions debug (`client.sessions.debug`) — live-view embed URLs
 *
 * Interactive browsing uses Stagehand via session-store.ts instead.
 *
 * @see docs/architecture/browserbase-integration.md
 */
import "server-only";

import { Browserbase } from "@browserbasehq/sdk";
import { getBrowserbaseApiKey } from "./config";

/** Process-level singleton — safe to reuse across requests in the same Node process. */
let browserbaseClient: Browserbase | null = null;

/**
 * Returns the shared Browserbase SDK client.
 *
 * @throws When BROWSERBASE_API_KEY is not set in the environment.
 */
export function getBrowserbaseClient(): Browserbase {
  const apiKey = getBrowserbaseApiKey();

  if (!apiKey) {
    throw new Error(
      "BROWSERBASE_API_KEY is not configured. Add it to your environment to enable browser tools."
    );
  }

  if (!browserbaseClient) {
    browserbaseClient = new Browserbase({ apiKey });
  }

  return browserbaseClient;
}
