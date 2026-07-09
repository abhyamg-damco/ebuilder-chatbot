import { DEFAULT_BROWSER_IDLE_TIMEOUT_MS } from "@/lib/settings/defaults";
import { isBrowserbaseEnabled } from "@/lib/browserbase/config";

/**
 * GET /api/browserbase/status
 *
 * Returns whether Browserbase browser tools are configured.
 * Used by the client to show "Use in browser" attachment controls.
 */
export function GET() {
  return Response.json({
    enabled: isBrowserbaseEnabled(),
    idleTimeoutMs: DEFAULT_BROWSER_IDLE_TIMEOUT_MS,
  });
}
