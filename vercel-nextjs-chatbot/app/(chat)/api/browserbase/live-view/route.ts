import { auth } from "@/app/(auth)/auth";
import { isBrowserbaseEnabled } from "@/lib/browserbase/config";
import { getSessionLiveViewUrl } from "@/lib/browserbase/live-view";
import {
  getBrowserSessionByBrowserbaseId,
  getChatById,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

/**
 * GET /api/browserbase/live-view?sessionId={uuid}&chatId={uuid}
 *
 * Returns embeddable live-view URL after verifying session ownership.
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
  const chatId = searchParams.get("chatId");

  if (!sessionId) {
    return new ChatbotError("bad_request:api", "sessionId is required").toResponse();
  }

  if (chatId) {
    const chat = await getChatById({ id: chatId });
    if (!chat || chat.userId !== session.user.id) {
      return new ChatbotError("forbidden:chat").toResponse();
    }

    const browserSession = await getBrowserSessionByBrowserbaseId({
      browserbaseSessionId: sessionId,
      chatId,
    });

    if (!browserSession) {
      return new ChatbotError("forbidden:chat", "Session not found for chat").toResponse();
    }
  } else {
    const browserSession = await getBrowserSessionByBrowserbaseId({
      browserbaseSessionId: sessionId,
    });

    if (!browserSession) {
      return new ChatbotError("forbidden:chat", "Unknown browser session").toResponse();
    }

    const chat = await getChatById({ id: browserSession.chatId });
    if (!chat || chat.userId !== session.user.id) {
      return new ChatbotError("forbidden:chat").toResponse();
    }
  }

  try {
    const debuggerFullscreenUrl = await getSessionLiveViewUrl(sessionId);
    return Response.json({ debuggerFullscreenUrl });
  } catch {
    return Response.json(
      { error: "Live view not ready yet" },
      { status: 404 }
    );
  }
}
