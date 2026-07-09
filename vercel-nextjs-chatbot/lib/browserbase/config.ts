/**
 * @file Browserbase configuration and feature flags
 *
 * Centralizes env-based settings for the Browserbase integration.
 * Only BROWSERBASE_API_KEY is required — the API key resolves the project
 * automatically (no BROWSERBASE_PROJECT_ID needed).
 *
 * @see docs/architecture/browserbase-integration.md
 */

/** Model Gateway model ID — billed through the Browserbase API key. */
export const BROWSERBASE_MODEL = "google/gemini-2.5-flash";

/**
 * Max steps for browserAgent tool calls.
 * Kept low to stay within the chat route's 60s serverless timeout.
 */
export const BROWSER_AGENT_MAX_STEPS = 30;

/**
 * Auto-close keepAlive browser sessions after this idle period (no agent activity).
 * @deprecated Use per-user settings via {@link DEFAULT_BROWSER_IDLE_TIMEOUT_MS}.
 */
export { DEFAULT_BROWSER_IDLE_TIMEOUT_MS as BROWSER_IDLE_TIMEOUT_MS } from "@/lib/settings/defaults";

/**
 * Reads BROWSERBASE_API_KEY from the environment.
 *
 * @returns Trimmed API key, or undefined when not configured.
 */
export function getBrowserbaseApiKey(): string | undefined {
  const key = process.env.BROWSERBASE_API_KEY?.trim();
  return key || undefined;
}

/**
 * Feature gate — browser tools are only registered when the API key is set.
 *
 * @returns True when Browserbase tools should be available in the chat API.
 */
export function isBrowserbaseEnabled(): boolean {
  return Boolean(getBrowserbaseApiKey());
}

/**
 * Directory for Stagehand's action cache (observe→act replay without LLM).
 *
 * Vercel serverless has a read-only filesystem except /tmp, so we use
 * /tmp/stagehand-cache in production and a project-local folder in dev.
 *
 * @returns Absolute or relative path for Stagehand cacheDir option.
 */
export function getStagehandCacheDir(): string {
  return process.env.VERCEL ? "/tmp/stagehand-cache" : ".stagehand-cache";
}
