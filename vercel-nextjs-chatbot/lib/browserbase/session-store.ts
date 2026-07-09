/**
 * @file In-memory Browserbase session store with Postgres metadata persistence.
 */
import "server-only";

import { after } from "next/server";
import type { UIMessageStreamWriter } from "ai";
import {
  createBrowserSessionRecord,
  endBrowserSessionRecord,
  getActiveBrowserSessionForChat,
  updateBrowserSessionRecord,
} from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/types";
import { getBrowserIdleTimeoutMs } from "@/lib/settings/get-browser-idle-timeout";
import { getBrowserbaseClient } from "./client";
import { getSessionLiveViewUrl } from "./live-view";
import {
  createStagehandInstance,
  type StagehandInstance,
} from "./stagehand-loader";

/** Active cloud browser session bound to a chat conversation. */
export type SyncedBrowserFile = {
  uploadId: string;
  remotePath: string;
  filename: string;
};

/** Active cloud browser session bound to a chat conversation. */
export type ActiveBrowserSession = {
  stagehand: StagehandInstance;
  sessionId: string;
  liveViewUrl: string;
  /** Files synced into this session via Browserbase Session Uploads API. */
  syncedFiles: Map<string, SyncedBrowserFile>;
};

const activeSessions = new Map<string, ActiveBrowserSession>();

/** Bumps when agent reconnects so stale `after()` idle callbacks are ignored. */
const idleCloseGenerations = new Map<string, number>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Returns true when the session has had no agent activity for the idle window. */
export function isBrowserSessionIdle(
  lastActivityAt: Date,
  idleTimeoutMs: number
): boolean {
  return Date.now() - lastActivityAt.getTime() >= idleTimeoutMs;
}

function invalidateIdleBrowserClose(chatId: string): void {
  idleCloseGenerations.set(chatId, (idleCloseGenerations.get(chatId) ?? 0) + 1);
}

/**
 * Schedules a server-side idle close after the agent releases the browser.
 * Invalidated when the agent reconnects within the idle window.
 */
function scheduleIdleBrowserClose({
  chatId,
  sessionId,
  userId,
  idleTimeoutMs,
}: {
  chatId: string;
  sessionId: string;
  userId: string;
  idleTimeoutMs: number;
}): void {
  const generation = (idleCloseGenerations.get(chatId) ?? 0) + 1;
  idleCloseGenerations.set(chatId, generation);

  after(async () => {
    await sleep(idleTimeoutMs);

    if (idleCloseGenerations.get(chatId) !== generation) {
      return;
    }

    if (activeSessions.has(chatId)) {
      return;
    }

    await closeBrowserSessionIfIdle({ chatId, sessionId, userId });
  });
}

/**
 * Ends a keepAlive session when it has been idle longer than the configured timeout.
 *
 * @returns True when the session was closed.
 */
export async function closeBrowserSessionIfIdle({
  chatId,
  sessionId,
  userId,
}: {
  chatId: string;
  sessionId?: string;
  userId: string;
}): Promise<boolean> {
  if (activeSessions.has(chatId)) {
    return false;
  }

  const persisted = await getActiveBrowserSessionForChat({ chatId });

  if (!persisted) {
    return false;
  }

  if (sessionId && persisted.browserbaseSessionId !== sessionId) {
    return false;
  }

  const idleTimeoutMs = await getBrowserIdleTimeoutMs(userId);

  if (!isBrowserSessionIdle(persisted.lastActivityAt, idleTimeoutMs)) {
    return false;
  }

  await closeBrowserSession({ chatId });
  return true;
}

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
 * Reconnects Stagehand to a persisted Browserbase session (keepAlive must be on).
 *
 * @returns Active session state, or null when the cloud session is no longer available.
 */
async function reconnectBrowserSession({
  chatId,
  browserbaseSessionId,
  title,
  startedUrl,
}: {
  chatId: string;
  browserbaseSessionId: string;
  title?: string;
  startedUrl?: string;
}): Promise<ActiveBrowserSession | null> {
  const stagehand = await createStagehandInstance({
    browserbaseSessionID: browserbaseSessionId,
  });

  try {
    await stagehand.init();
  } catch {
    await stagehand.close().catch(() => undefined);
    await endBrowserSessionRecord({
      browserbaseSessionId,
      status: "ended",
    });
    return null;
  }

  const sessionId = stagehand.browserbaseSessionID ?? browserbaseSessionId;
  const liveViewUrl = await getSessionLiveViewUrl(sessionId);
  const session: ActiveBrowserSession = {
    stagehand,
    sessionId,
    liveViewUrl,
    syncedFiles: new Map(),
  };

  activeSessions.set(chatId, session);

  await updateBrowserSessionRecord({
    browserbaseSessionId: sessionId,
    lastKnownUrl: startedUrl,
    title,
    status: "running",
    liveViewUrl,
  });

  return session;
}

/**
 * Returns the active session for a chat, or creates a new cloud browser session.
 *
 * Reuses the in-memory handle within one request, and reconnects to a persisted
 * keepAlive session across follow-up chat messages.
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
    invalidateIdleBrowserClose(chatId);
    await updateBrowserSessionRecord({
      browserbaseSessionId: existing.sessionId,
      ...(startedUrl ? { lastKnownUrl: startedUrl } : {}),
      status: "running",
      ...(title ? { title } : {}),
    });
    return existing;
  }

  const persisted = await getActiveBrowserSessionForChat({ chatId });

  if (persisted) {
    const idleTimeoutMs = await getBrowserIdleTimeoutMs(userId);

    if (isBrowserSessionIdle(persisted.lastActivityAt, idleTimeoutMs)) {
      await closeBrowserSession({ chatId });
    } else {
      invalidateIdleBrowserClose(chatId);

      const reconnected = await reconnectBrowserSession({
        chatId,
        browserbaseSessionId: persisted.browserbaseSessionId,
        title: title ?? persisted.title ?? undefined,
        startedUrl,
      });

      if (reconnected) {
        emitBrowserSessionEvent(dataStream, {
          sessionId: reconnected.sessionId,
          liveViewUrl: reconnected.liveViewUrl,
          status: "running",
          title: title ?? persisted.title ?? "Live browser",
        });
        return reconnected;
      }
    }
  }

  invalidateIdleBrowserClose(chatId);

  const stagehand = await createStagehandInstance();
  await stagehand.init();

  const sessionId = stagehand.browserbaseSessionID;

  if (!sessionId) {
    await stagehand.close();
    throw new Error("Browserbase session id missing after Stagehand init.");
  }

  const liveViewUrl = await getSessionLiveViewUrl(sessionId);
  const session: ActiveBrowserSession = {
    stagehand,
    sessionId,
    liveViewUrl,
    syncedFiles: new Map(),
  };

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
 * Disconnects Stagehand but keeps the cloud browser alive for the next chat turn.
 *
 * Used when the agent finishes a turn while waiting for user input (OTP, etc.).
 */
export async function releaseBrowserSession({
  chatId,
  userId,
}: {
  chatId: string;
  userId: string;
}): Promise<void> {
  const session = activeSessions.get(chatId);

  if (!session) {
    return;
  }

  const { sessionId } = session;
  activeSessions.delete(chatId);

  await updateBrowserSessionRecord({
    browserbaseSessionId: sessionId,
    status: "running",
  });

  const idleTimeoutMs = await getBrowserIdleTimeoutMs(userId);

  // keepAlive: true — cloud session stays running for reconnect on the next message.
  await session.stagehand.close();

  scheduleIdleBrowserClose({ chatId, sessionId, userId, idleTimeoutMs });
}

/**
 * Fully ends the cloud browser for a chat and persists ended status.
 *
 * Called only via the explicit closeBrowser tool.
 */
export async function closeBrowserSession({
  chatId,
  dataStream,
}: {
  chatId: string;
  dataStream?: UIMessageStreamWriter<ChatMessage>;
}): Promise<void> {
  invalidateIdleBrowserClose(chatId);

  const session = activeSessions.get(chatId);
  const sessionId = session?.sessionId;

  if (session) {
    activeSessions.delete(chatId);
    await session.stagehand.close();
  }

  if (!sessionId) {
    const persisted = await getActiveBrowserSessionForChat({ chatId });
    if (!persisted) {
      return;
    }

    const client = getBrowserbaseClient();
    await client.sessions.update(persisted.browserbaseSessionId, {
      status: "REQUEST_RELEASE",
    });

    await endBrowserSessionRecord({
      browserbaseSessionId: persisted.browserbaseSessionId,
      status: "ended",
    });

    if (dataStream) {
      emitBrowserSessionEvent(dataStream, {
        sessionId: persisted.browserbaseSessionId,
        status: "ended",
      });
    }
    return;
  }

  const client = getBrowserbaseClient();
  await client.sessions.update(sessionId, { status: "REQUEST_RELEASE" });

  await endBrowserSessionRecord({
    browserbaseSessionId: sessionId,
    status: "ended",
  });

  if (dataStream) {
    emitBrowserSessionEvent(dataStream, {
      sessionId,
      status: "ended",
    });
  }
}
