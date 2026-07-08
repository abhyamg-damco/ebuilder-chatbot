/**
 * @file GET /api/browserbase/live-view
 *
 * Returns the embeddable live-view URL for a Browserbase session.
 * The BROWSERBASE_API_KEY never leaves the server — the client only
 * receives debuggerFullscreenUrl for the iframe src.
 *
 * Used by BrowserPanel as a poll fallback when the SSE stream has not
 * yet delivered liveViewUrl.
 *
 * @see docs/decisions/003-live-browser-panel.md
 */
import { auth } from "@/app/(auth)/auth";
import { isBrowserbaseEnabled } from "@/lib/browserbase/config";
import { getSessionLiveViewUrl } from "@/lib/browserbase/live-view";
import { ChatbotError } from "@/lib/errors";

/**
 * @param request - Must include ?sessionId={uuid} query parameter.
 * @returns JSON `{ debuggerFullscreenUrl }` or 404 while session is starting.
 */
export async function GET(request: Request) {
  if (!isBrowserbaseEnabled()) {
    return new ChatbotError("offline:chat").toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return new ChatbotError("bad_request:api", "sessionId is required").toResponse();
  }

  try {
    const debuggerFullscreenUrl = await getSessionLiveViewUrl(sessionId);
    return Response.json({ debuggerFullscreenUrl });
  } catch {
    // Session still booting — client will retry.
    return Response.json(
      { error: "Live view not ready yet" },
      { status: 404 }
    );
  }
}
