/**
 * @file In-memory Browserbase session store with Postgres metadata persistence.
 */
import "server-only";

import type { UIMessageStreamWriter } from "ai";
import {
  createBrowserSessionRecord,
  endBrowserSessionRecord,
  updateBrowserSessionRecord,
} from "@/lib/db/queries";
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

const activeSessions = new Map<string, ActiveBrowserSession>();

type BrowserSessionStreamEvent = {
  sessionId: string;
  liveViewUrl?: string;
  status: "running" | "ended";
  title?: string;
};

function emitBrowserSessionEvent(
  dataStream: UIMessageStreamWriter<ChatMessage>,
  data: BrowserSessionStreamEvent
) {
  dataStream.write({
    type: "data-browserSession",
    data,
    transient: true,
  });
}

/**
 * Returns the active session for a chat, or creates a new cloud browser session.
 */
export async function getOrCreateBrowserSession({
  chatId,
  userId,
  dataStream,
  title,
  startedUrl,
}: {
  chatId: string;
  userId: string;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  title?: string;
  startedUrl?: string;
}): Promise<ActiveBrowserSession> {
  const existing = activeSessions.get(chatId);

  if (existing) {
    if (startedUrl) {
      await updateBrowserSessionRecord({
        browserbaseSessionId: existing.sessionId,
        lastKnownUrl: startedUrl,
        status: "running",
        title,
      });
    }
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

  await createBrowserSessionRecord({
    chatId,
    userId,
    browserbaseSessionId: sessionId,
    status: "running",
    title: title ?? "Live browser",
    startedUrl,
    liveViewUrl,
  });

  emitBrowserSessionEvent(dataStream, {
    sessionId,
    liveViewUrl,
    status: "running",
    title: title ?? "Live browser",
  });

  return session;
}

/** Updates last-known URL for the active browser session. */
export async function touchBrowserSession({
  chatId,
  lastKnownUrl,
  title,
}: {
  chatId: string;
  lastKnownUrl?: string;
  title?: string;
}): Promise<void> {
  const existing = activeSessions.get(chatId);
  if (!existing) {
    return;
  }

  await updateBrowserSessionRecord({
    browserbaseSessionId: existing.sessionId,
    lastKnownUrl,
    title,
    status: "running",
  });
}

/**
 * Closes the cloud browser for a chat and persists ended status.
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
    await endBrowserSessionRecord({
      browserbaseSessionId: session.sessionId,
      status: "ended",
    });

    if (dataStream) {
      emitBrowserSessionEvent(dataStream, {
        sessionId: session.sessionId,
        status: "ended",
      });
    }
  }
}

/** Closes all in-memory sessions and marks DB records ended. */
export async function closeAllBrowserSessions(): Promise<void> {
  const closers = [...activeSessions.keys()].map((chatId) =>
    closeBrowserSession({ chatId })
  );
  await Promise.all(closers);
}
