"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { useEffect } from "react";
import { useSWRConfig } from "swr";
import { DEFAULT_BROWSER_IDLE_TIMEOUT_MS } from "@/lib/settings/defaults";
import type { ChatMessage } from "@/lib/types";
import { useBrowserPanel } from "./use-browser-panel";
import { useOpenBrowserPanel } from "./use-open-browser-panel";
import { useUserSettings } from "./use-user-settings";

type ChatStatus = UseChatHelpers<ChatMessage>["status"];

function getRemainingIdleMs(
  lastActivityAt: string | undefined,
  idleTimeoutMs: number
): number {
  if (!lastActivityAt) {
    return idleTimeoutMs;
  }

  const elapsed = Date.now() - new Date(lastActivityAt).getTime();
  return Math.max(0, idleTimeoutMs - elapsed);
}

/**
 * Closes the cloud browser after the agent has been idle for the user's configured timeout.
 */
export function useBrowserIdleClose(
  chatId: string,
  status: ChatStatus,
  enabled: boolean,
  settingsEnabled = true
) {
  const { mutate } = useSWRConfig();
  const { setBrowserPanel } = useBrowserPanel();
  const { hasActiveBrowser, activeSession } = useOpenBrowserPanel(chatId);
  const { browserIdleTimeoutMs } = useUserSettings(settingsEnabled);
  const idleTimeoutMs = settingsEnabled
    ? browserIdleTimeoutMs
    : DEFAULT_BROWSER_IDLE_TIMEOUT_MS;
  const isAgentWorking = status === "streaming" || status === "submitted";
  const metadataKey = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/chat/${chatId}/metadata`;

  useEffect(() => {
    if (!enabled || !hasActiveBrowser || isAgentWorking) {
      return;
    }

    const sessionId = activeSession?.browserbaseSessionId;
    if (!sessionId) {
      return;
    }

    const delayMs = getRemainingIdleMs(
      activeSession.lastActivityAt,
      idleTimeoutMs
    );

    if (delayMs === 0) {
      void closeIdleBrowser(chatId, metadataKey, mutate, setBrowserPanel);
      return;
    }

    const timer = setTimeout(() => {
      void closeIdleBrowser(chatId, metadataKey, mutate, setBrowserPanel);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [
    enabled,
    hasActiveBrowser,
    isAgentWorking,
    chatId,
    activeSession?.browserbaseSessionId,
    activeSession?.lastActivityAt,
    idleTimeoutMs,
    metadataKey,
    mutate,
    setBrowserPanel,
  ]);
}

async function closeIdleBrowser(
  chatId: string,
  metadataKey: string,
  mutate: ReturnType<typeof useSWRConfig>["mutate"],
  setBrowserPanel: ReturnType<typeof useBrowserPanel>["setBrowserPanel"]
) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/browserbase/close`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId }),
    }
  );

  if (!response.ok) {
    return;
  }

  const result = (await response.json()) as { closed?: boolean };

  if (!result.closed) {
    return;
  }

  setBrowserPanel((current) => ({
    ...current,
    status: "ended",
    isVisible: false,
  }));
  void mutate(metadataKey);
}
