import { auth } from "@/app/(auth)/auth";
import { buildUploadAccessList } from "@/lib/chat/uploads";
import {
  getActiveBrowserSessionForChat,
  getBrowserSessionsByChatId,
  getChatById,
  getChatUploadsByChatId,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/chat/[id]/metadata
 *
 * Returns upload inventory and browser session history for a chat.
 */
export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const { id: chatId } = await context.params;
  const chat = await getChatById({ id: chatId });

  if (!chat) {
    return Response.json({
      uploads: { count: 0, items: [] },
      browserSessions: { active: null, history: [] },
    });
  }

  if (chat.userId !== session.user.id) {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  const [uploadRecords, browserHistory, activeBrowser] = await Promise.all([
    getChatUploadsByChatId({ chatId }),
    getBrowserSessionsByChatId({ chatId, limit: 10 }),
    getActiveBrowserSessionForChat({ chatId }),
  ]);

  const uploadItems = await buildUploadAccessList(uploadRecords);

  return Response.json({
    uploads: {
      count: uploadItems.length,
      items: uploadItems.map((item) => ({
        id: item.id,
        originalFilename: item.originalFilename,
        mimeType: item.mimeType,
        category: item.category,
        url: item.url,
        expiresAt: item.expiresAt,
        isPublic: item.isPublic,
        pageCount: item.pageCount,
        hasTextPreview: Boolean(item.extractedTextPreview),
        useInBrowser: item.useInBrowser ?? false,
        browserRemotePath: item.browserRemotePath,
        browserSyncedSessionId: item.browserSyncedSessionId,
        browserSyncedAt: item.browserSyncedAt,
      })),
    },
    browserSessions: {
      active: activeBrowser
        ? {
            id: activeBrowser.id,
            browserbaseSessionId: activeBrowser.browserbaseSessionId,
            status: activeBrowser.status,
            title: activeBrowser.title,
            startedUrl: activeBrowser.startedUrl,
            lastKnownUrl: activeBrowser.lastKnownUrl,
            liveViewUrl: activeBrowser.liveViewUrl,
            replayUrl: activeBrowser.replayUrl,
            startedAt: activeBrowser.startedAt.toISOString(),
            lastActivityAt: activeBrowser.lastActivityAt.toISOString(),
            durationSeconds: activeBrowser.durationSeconds,
          }
        : null,
      history: browserHistory.map((row) => ({
        id: row.id,
        browserbaseSessionId: row.browserbaseSessionId,
        status: row.status,
        title: row.title,
        startedUrl: row.startedUrl,
        lastKnownUrl: row.lastKnownUrl,
        replayUrl: row.replayUrl,
        startedAt: row.startedAt.toISOString(),
        endedAt: row.endedAt?.toISOString() ?? null,
        durationSeconds: row.durationSeconds,
        errorMessage: row.errorMessage,
      })),
    },
  });
}
