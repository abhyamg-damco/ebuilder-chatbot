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

/**
 * Creates a new Stagehand instance configured for Browserbase cloud browsers.
 *
 * LLM calls route through Browserbase Model Gateway via BROWSERBASE_API_KEY —
 * no separate OpenAI/Anthropic key is required on the free tier.
 *
 * @returns An initialized-ready Stagehand instance (call `.init()` before use).
 */
export async function createStagehandInstance(): Promise<StagehandInstance> {
  const { Stagehand: StagehandClient } = await loadStagehandModule();

  return new StagehandClient({
    env: "BROWSERBASE",
    model: BROWSERBASE_MODEL,
    // Persists observe→act cache across runs for faster repeat automations.
    cacheDir: getStagehandCacheDir(),
  });
}
