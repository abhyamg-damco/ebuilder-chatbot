import type { UIMessageStreamWriter } from "ai";
import type {
  ActivityLogEntry,
  ActivityStreamEntry,
  ActivityStreamStatus,
} from "@/lib/chat/activity-log";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

export type ActivityCollector = {
  entries: ActivityStreamEntry[];
};

export type EmitAgentActivityPayload = {
  message: string;
  status: ActivityStreamStatus;
  category?: "browser" | "tool" | "thinking";
  id?: string;
};

/** Creates an in-memory buffer for one chat turn's activity events. */
export function createActivityCollector(): ActivityCollector {
  return { entries: [] };
}

/**
 * Writes a live SSE activity event and appends to the turn collector.
 * Marks the previous active entry as done when a new active event arrives.
 */
export function emitAgentActivity(
  dataStream: UIMessageStreamWriter<ChatMessage>,
  collector: ActivityCollector,
  payload: EmitAgentActivityPayload
): ActivityStreamEntry {
  if (payload.status === "active") {
    markLastActiveAsDone(collector);
  }

  const entry: ActivityStreamEntry = {
    id: payload.id ?? generateUUID(),
    message: payload.message,
    status: payload.status,
    category: payload.category,
    timestamp: Date.now(),
  };

  collector.entries.push(entry);

  dataStream.write({
    type: "data-agent-activity",
    data: {
      id: entry.id,
      message: entry.message,
      status: entry.status,
      category: entry.category,
    },
  });

  return entry;
}

/** Marks the most recent active entry as done. */
export function markLastActiveAsDone(collector: ActivityCollector): void {
  for (let index = collector.entries.length - 1; index >= 0; index -= 1) {
    const entry = collector.entries[index];

    if (entry.status === "active") {
      entry.status = "done";
      break;
    }
  }
}

/** Marks the most recent active entry as error. */
export function markLastActiveAsError(collector: ActivityCollector): void {
  for (let index = collector.entries.length - 1; index >= 0; index -= 1) {
    const entry = collector.entries[index];

    if (entry.status === "active") {
      entry.status = "error";
      break;
    }
  }
}

/** Finalizes collector entries for DB persistence (all non-error → done). */
export function finalizeActivityCollector(
  collector: ActivityCollector
): ActivityLogEntry[] {
  markLastActiveAsDone(collector);

  return collector.entries.map((entry) => ({
    id: entry.id,
    message: entry.message,
    status: entry.status === "error" ? "error" : "done",
    category: entry.category,
    timestamp: entry.timestamp,
  }));
}

/** Builds the activity-log part to append to an assistant message. */
export function buildActivityLogPart(
  activities: ActivityLogEntry[]
): { type: "activity-log"; activities: ActivityLogEntry[] } | null {
  if (activities.length === 0) {
    return null;
  }

  return {
    type: "activity-log",
    activities,
  };
}
