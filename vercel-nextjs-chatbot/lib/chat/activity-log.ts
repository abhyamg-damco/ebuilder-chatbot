/** Persisted activity entry stored on assistant messages after a turn completes. */
export type ActivityLogEntry = {
  id: string;
  message: string;
  status: "done" | "error";
  category?: "browser" | "tool" | "thinking";
  timestamp: number;
};

/** Message part shape saved in Message_v2.parts JSON. */
export type ActivityLogPart = {
  type: "activity-log";
  activities: ActivityLogEntry[];
};

/** Live stream event status — includes in-progress steps. */
export type ActivityStreamStatus = "active" | "done" | "error";

export type ActivityStreamEntry = {
  id: string;
  message: string;
  status: ActivityStreamStatus;
  category?: "browser" | "tool" | "thinking";
  timestamp: number;
};

/** Extract persisted activities from message parts. */
export function getActivityLogFromParts(
  parts: Array<{ type: string; activities?: ActivityLogEntry[] }> | undefined
): ActivityLogEntry[] {
  if (!parts) {
    return [];
  }

  const logPart = parts.find(
    (part): part is ActivityLogPart => part.type === "activity-log"
  );

  return logPart?.activities ?? [];
}

/** Whether any activity-log part exists in the message. */
export function hasActivityLogPart(
  parts: Array<{ type: string }> | undefined
): boolean {
  return parts?.some((part) => part.type === "activity-log") ?? false;
}
