import { auth } from "@/app/(auth)/auth";
import { closeBrowserSessionIfIdle } from "@/lib/browserbase/session-store";
import { getChatById } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

/**
 * POST /api/browserbase/close
 *
 * Closes the active cloud browser for a chat when it has been idle
 * longer than BROWSER_IDLE_TIMEOUT_MS.
 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  let chatId: string | undefined;

  try {
    const body = (await request.json()) as { chatId?: string };
    chatId = body.chatId;
  } catch {
    return new ChatbotError("bad_request:api", "Invalid JSON body").toResponse();
  }

  if (!chatId) {
    return new ChatbotError("bad_request:api", "chatId is required").toResponse();
  }

  const chat = await getChatById({ id: chatId });

  if (!chat) {
    return Response.json({ closed: false, reason: "chat_not_found" });
  }

  if (chat.userId !== session.user.id) {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  const closed = await closeBrowserSessionIfIdle({
    chatId,
    userId: chat.userId,
  });

  return Response.json({ closed });
}
