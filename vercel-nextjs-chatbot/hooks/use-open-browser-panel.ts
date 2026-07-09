"use client";

import { useCallback } from "react";
import { useBrowserPanel } from "@/hooks/use-browser-panel";
import {
  type ChatMetadataBrowserSession,
  useChatMetadata,
} from "@/hooks/use-chat-metadata";

export type OpenBrowserPanelOptions = {
  sessionId: string;
  liveViewUrl?: string | null;
  title?: string;
};

/**
 * Opens the right-hand live browser panel from chat UI affordances
 * (header badge, session chip, attachment with "Browser" flag).
 */
export function useOpenBrowserPanel(chatId: string) {
  const { setBrowserPanel } = useBrowserPanel();
  const { data: chatMetadata } = useChatMetadata(chatId);

  const activeSession = chatMetadata?.browserSessions.active ?? null;

  const openBrowserPanel = useCallback(
    (override?: OpenBrowserPanelOptions) => {
      const sessionId =
        override?.sessionId ?? activeSession?.browserbaseSessionId;

      if (!sessionId) {
        return;
      }

      setBrowserPanel({
        sessionId,
        liveViewUrl:
          override?.liveViewUrl ?? activeSession?.liveViewUrl ?? null,
        title: override?.title ?? activeSession?.title ?? "Live browser",
        status: "running",
        isVisible: true,
      });
    },
    [activeSession, setBrowserPanel]
  );

  return {
    openBrowserPanel,
    activeSession,
    hasActiveBrowser: Boolean(activeSession),
  };
}

export type { ChatMetadataBrowserSession };
