"use client";

import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ActivityLogEntry,
  ActivityStreamEntry,
} from "@/lib/chat/activity-log";
import type { CustomUIDataTypes } from "@/lib/types";

export type AgentActivityDisplayEntry = {
  id: string;
  message: string;
  status: "active" | "done" | "error";
  category?: "browser" | "tool" | "thinking";
  timestamp: number;
};

type AgentActivityContextValue = {
  pendingActivities: AgentActivityDisplayEntry[];
  revision: number;
  getActivitiesForMessage: (messageId: string) => AgentActivityDisplayEntry[];
  ingestActivityEvent: (
    data: CustomUIDataTypes["agent-activity"]
  ) => void;
  bindPendingToMessage: (messageId: string) => void;
  resetForChat: (chatId: string) => void;
};

const AgentActivityContext = createContext<AgentActivityContextValue | null>(
  null
);

function toDisplayEntry(
  entry: ActivityStreamEntry | ActivityLogEntry,
  defaultStatus: AgentActivityDisplayEntry["status"] = "done"
): AgentActivityDisplayEntry {
  return {
    id: entry.id,
    message: entry.message,
    status:
      "status" in entry && entry.status === "active"
        ? "active"
        : entry.status === "error"
          ? "error"
          : defaultStatus,
    category: entry.category,
    timestamp: entry.timestamp,
  };
}

function mergeActivityLists(
  existing: AgentActivityDisplayEntry[],
  incoming: AgentActivityDisplayEntry[]
): AgentActivityDisplayEntry[] {
  const byId = new Map(existing.map((entry) => [entry.id, entry]));

  for (const entry of incoming) {
    byId.set(entry.id, entry);
  }

  return [...byId.values()].sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Accumulates live agent-activity SSE events per message.
 * Survives DataStreamHandler clearing the transient dataStream buffer.
 */
export function AgentActivityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pendingActivities, setPendingActivities] = useState<
    AgentActivityDisplayEntry[]
  >([]);
  const activitiesByMessageRef = useRef<
    Map<string, AgentActivityDisplayEntry[]>
  >(new Map());
  const [revision, setRevision] = useState(0);
  const chatIdRef = useRef<string | null>(null);

  const bump = useCallback(() => {
    setRevision((value) => value + 1);
  }, []);

  const ingestActivityEvent = useCallback(
    (data: CustomUIDataTypes["agent-activity"]) => {
      const entry: AgentActivityDisplayEntry = {
        id: data.id,
        message: data.message,
        status: data.status,
        category: data.category,
        timestamp: Date.now(),
      };

      setPendingActivities((current) => {
        const withoutSameId = current.filter((item) => item.id !== entry.id);
        const previousActive = withoutSameId.map((item) =>
          item.status === "active" && entry.status === "active"
            ? { ...item, status: "done" as const }
            : item
        );

        return [...previousActive, entry];
      });
      bump();
    },
    [bump]
  );

  const bindPendingToMessage = useCallback(
    (messageId: string) => {
      setPendingActivities((current) => {
        if (current.length === 0) {
          return current;
        }

        const existing = activitiesByMessageRef.current.get(messageId) ?? [];
        activitiesByMessageRef.current.set(
          messageId,
          mergeActivityLists(existing, current)
        );
        bump();
        return [];
      });
    },
    [bump]
  );

  const getActivitiesForMessage = useCallback((messageId: string) => {
    return activitiesByMessageRef.current.get(messageId) ?? [];
  }, []);

  const resetForChat = useCallback(
    (chatId: string) => {
      if (chatIdRef.current === chatId) {
        return;
      }

      chatIdRef.current = chatId;
      activitiesByMessageRef.current = new Map();
      setPendingActivities([]);
      bump();
    },
    [bump]
  );

  const value = useMemo(
    () => ({
      pendingActivities,
      revision,
      getActivitiesForMessage,
      ingestActivityEvent,
      bindPendingToMessage,
      resetForChat,
    }),
    [
      pendingActivities,
      revision,
      getActivitiesForMessage,
      ingestActivityEvent,
      bindPendingToMessage,
      resetForChat,
    ]
  );

  return (
    <AgentActivityContext.Provider value={value}>
      {children}
    </AgentActivityContext.Provider>
  );
}

export function useAgentActivityContext() {
  const context = useContext(AgentActivityContext);

  if (!context) {
    throw new Error(
      "useAgentActivityContext must be used within AgentActivityProvider"
    );
  }

  return context;
}

/** Converts persisted activity-log entries for display. */
export function persistedActivitiesToDisplay(
  entries: ActivityLogEntry[]
): AgentActivityDisplayEntry[] {
  return entries.map((entry) => toDisplayEntry(entry, "done"));
}
