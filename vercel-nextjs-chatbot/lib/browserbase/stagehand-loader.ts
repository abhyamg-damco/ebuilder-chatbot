/**
 * @file Stagehand runtime loader
 *
 * Stagehand (@browserbasehq/stagehand) depends on ai@5, while this chatbot uses ai@6.
 * A static `import` would pull both into the Next.js bundle and cause export conflicts.
 *
 * This module:
 * - Uses `import type` for compile-time typing only (erased at build — no bundle pull)
 * - Uses `await import()` at runtime so Node loads Stagehand from node_modules directly
 * - Relies on `serverExternalPackages` in next.config.ts to keep Turbopack from bundling it
 *
 * @see docs/architecture/browserbase-integration.md
 * @see docs/decisions/001-dynamic-stagehand-loading.md
 */
import "server-only";

import type { Stagehand } from "@browserbasehq/stagehand";
import {
  BROWSERBASE_MODEL,
  getStagehandCacheDir,
} from "./config";

/** Live Stagehand V3 instance — inferred from the SDK class (type-only import). */
export type StagehandInstance = InstanceType<typeof Stagehand>;

/** Shape of the dynamically imported Stagehand package. */
type StagehandModule = typeof import("@browserbasehq/stagehand");

/** Cached module reference — Stagehand is loaded once per server process. */
let stagehandModule: StagehandModule | null = null;

/**
 * Dynamically imports the Stagehand package at runtime.
 *
 * @returns The full Stagehand module (constructor + utilities).
 */
async function loadStagehandModule(): Promise<StagehandModule> {
  if (!stagehandModule) {
    // Dynamic import keeps ai@5 out of the Next.js app bundle.
    stagehandModule = await import("@browserbasehq/stagehand");
  }

  return stagehandModule;
}

/** Options when creating or reconnecting to a Browserbase-backed Stagehand instance. */
export type CreateStagehandOptions = {
  /** Reconnect to an existing Browserbase session (requires keepAlive on create). */
  browserbaseSessionID?: string;
};

/**
 * Creates a new Stagehand instance configured for Browserbase cloud browsers.
 *
 * LLM calls route through Browserbase Model Gateway via BROWSERBASE_API_KEY —
 * no separate OpenAI/Anthropic key is required on the free tier.
 *
 * `keepAlive: true` lets the cloud session survive `stagehand.close()` so the
 * agent can pause for chat input (OTP, credentials) and reconnect on the next turn.
 *
 * @returns An initialized-ready Stagehand instance (call `.init()` before use).
 */
export async function createStagehandInstance(
  options: CreateStagehandOptions = {}
): Promise<StagehandInstance> {
  const { Stagehand: StagehandClient } = await loadStagehandModule();

  return new StagehandClient({
    env: "BROWSERBASE",
    model: BROWSERBASE_MODEL,
    // Cloud session stays alive after disconnect — required for multi-turn flows.
    keepAlive: true,
    // Stagehand defaults to pino-pretty logging, which fails in Next standalone /
    // Cloud Run ("unable to determine transport target for pino-pretty").
    disablePino: process.env.NODE_ENV === "production" || process.env.NODE_ENV?.includes("remote"),
    browserbaseSessionCreateParams: {
      keepAlive: true,
      // Default 1h — enough for OTP / manual steps between chat messages.
      timeout: 3_600,
    },
    ...(options.browserbaseSessionID
      ? { browserbaseSessionID: options.browserbaseSessionID }
      : {}),
    // Persists observe→act cache across runs for faster repeat automations.
    cacheDir: getStagehandCacheDir(),
  });
}
