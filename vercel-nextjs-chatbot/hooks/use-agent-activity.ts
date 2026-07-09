"use client";

import { useEffect, useMemo } from "react";
import type { ChatMessage } from "@/lib/types";
import { getActivityLogFromParts } from "@/lib/chat/activity-log";
import {
  persistedActivitiesToDisplay,
  useAgentActivityContext,
  type AgentActivityDisplayEntry,
} from "@/components/chat/agent-activity-provider";

type UseAgentActivityForMessageOptions = {
  messageId: string;
  parts: ChatMessage["parts"] | undefined;
  isStreaming?: boolean;
};

/**
 * Resolves activity lines for one assistant message from live SSE buffer
 * and persisted activity-log parts.
 */
export function useAgentActivityForMessage({
  messageId,
  parts,
  isStreaming = false,
}: UseAgentActivityForMessageOptions): AgentActivityDisplayEntry[] {
  const {
    pendingActivities,
    revision,
    getActivitiesForMessage,
    bindPendingToMessage,
  } = useAgentActivityContext();

  const persisted = useMemo(
    () => getActivityLogFromParts(parts as Array<{ type: string }>),
    [parts]
  );

  useEffect(() => {
    if (isStreaming) {
      bindPendingToMessage(messageId);
    }
  }, [bindPendingToMessage, isStreaming, messageId]);

  return useMemo(() => {
    const persistedDisplay = persistedActivitiesToDisplay(persisted);
    const liveForMessage = getActivitiesForMessage(messageId);

    if (isStreaming && pendingActivities.length > 0) {
      return mergeActivities([
        ...persistedDisplay,
        ...liveForMessage,
        ...pendingActivities,
      ]);
    }

    if (liveForMessage.length > 0) {
      return mergeActivities([...persistedDisplay, ...liveForMessage]);
    }

    return persistedDisplay;
  }, [
    getActivitiesForMessage,
    isStreaming,
    messageId,
    pendingActivities,
    persisted,
    revision,
  ]);
}

/** Live activities shown before the assistant message object exists. */
export function usePendingAgentActivities(): AgentActivityDisplayEntry[] {
  const { pendingActivities } = useAgentActivityContext();
  return pendingActivities;
}

function mergeActivities(
  entries: AgentActivityDisplayEntry[]
): AgentActivityDisplayEntry[] {
  const byId = new Map<string, AgentActivityDisplayEntry>();

  for (const entry of entries) {
    byId.set(entry.id, entry);
  }

  return [...byId.values()].sort((a, b) => a.timestamp - b.timestamp);
}
