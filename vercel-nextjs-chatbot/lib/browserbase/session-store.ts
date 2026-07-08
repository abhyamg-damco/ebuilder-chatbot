/**
 * @file In-memory Browserbase session store
 *
 * Manages one shared Stagehand session per chat ID within a single API request.
 * All browser tools (navigate, act, extract, agent) reuse the same session so
 * the user sees one continuous live view in the right-hand panel.
 *
 * Lifecycle:
 * 1. First live-browser tool call → create Stagehand session → emit data-browserSession
 * 2. Subsequent tool calls in the same request → reuse existing session
 * 3. closeBrowser tool or stream onFinish → close session and clean up map
 *
 * @see docs/architecture/browserbase-integration.md
 * @see docs/decisions/005-session-lifecycle.md
 */
import "server-only";

import type { UIMessageStreamWriter } from "ai";
import type { ChatMessage } from "@/lib/types";
import { getSessionLiveViewUrl } from "./live-view";
import {
  createStagehandInstance,
  type StagehandInstance,
} from "./stagehand-loader";

/** Active cloud browser session bound to a chat conversation. */
export type ActiveBrowserSession = {
  stagehand: StagehandInstance;
  sessionId: string;
  liveViewUrl: string;
};

/**
 * Process-local session map keyed by chat ID.
 * Sessions do not persist across separate HTTP requests (serverless limitation).
 */
const activeSessions = new Map<string, ActiveBrowserSession>();

/** Payload written to the UI stream to open/update the browser panel. */
type BrowserSessionStreamEvent = {
  sessionId: string;
  liveViewUrl?: string;
  status: "running" | "ended";
  title?: string;
};

/**
 * Pushes a `data-browserSession` event to the chat SSE stream.
 * DataStreamHandler on the client reads this and opens BrowserPanel.
 *
 * @param dataStream - Writer from createUIMessageStream in the chat API route.
 * @param data - Session metadata for the live-view panel.
 */
function emitBrowserSessionEvent(
  dataStream: UIMessageStreamWriter<ChatMessage>,
  data: BrowserSessionStreamEvent
) {
  dataStream.write({
    type: "data-browserSession",
    data,
    transient: true, // UI-only — not persisted to the messages table.
  });
}

/**
 * Returns the active session for a chat, or creates a new cloud browser session.
 *
 * On first creation:
 * - Initializes Stagehand against Browserbase
 * - Fetches the live-view embed URL
 * - Emits a stream event so the right-hand panel opens immediately
 *
 * @param chatId - Chat UUID — scopes the session to one conversation per request.
 * @param dataStream - SSE writer for pushing live-view state to the client.
 * @param title - Optional label shown in the browser panel header.
 */
export async function getOrCreateBrowserSession({
  chatId,
  dataStream,
  title,
}: {
  chatId: string;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  title?: string;
}): Promise<ActiveBrowserSession> {
  const existing = activeSessions.get(chatId);

  if (existing) {
    return existing;
  }

  const stagehand = await createStagehandInstance();
  await stagehand.init();

  const sessionId = stagehand.browserbaseSessionID;

  if (!sessionId) {
    await stagehand.close();
    throw new Error("Browserbase session id missing after Stagehand init.");
  }

  const liveViewUrl = await getSessionLiveViewUrl(sessionId);
  const session: ActiveBrowserSession = { stagehand, sessionId, liveViewUrl };

  activeSessions.set(chatId, session);

  // Notify the client — this is what opens the right-hand live browser panel.
  emitBrowserSessionEvent(dataStream, {
    sessionId,
    liveViewUrl,
    status: "running",
    title: title ?? "Live browser",
  });

  return session;
}

/**
 * Closes the cloud browser for a chat and optionally notifies the UI.
 *
 * @param chatId - Chat whose session should be closed.
 * @param dataStream - When provided, emits status "ended" to the browser panel.
 */
export async function closeBrowserSession({
  chatId,
  dataStream,
}: {
  chatId: string;
  dataStream?: UIMessageStreamWriter<ChatMessage>;
}): Promise<void> {
  const session = activeSessions.get(chatId);

  if (!session) {
    return;
  }

  activeSessions.delete(chatId);

  try {
    await session.stagehand.close();
  } finally {
    if (dataStream) {
      emitBrowserSessionEvent(dataStream, {
        sessionId: session.sessionId,
        status: "ended",
      });
    }
  }
}

/**
 * Closes all in-memory sessions — called from streamText onFinish as a safety net.
 * Ensures cloud browsers are not left running if the agent forgets closeBrowser.
 */
export async function closeAllBrowserSessions(): Promise<void> {
  const closers = [...activeSessions.keys()].map((chatId) =>
    closeBrowserSession({ chatId })
  );
  await Promise.all(closers);
}
