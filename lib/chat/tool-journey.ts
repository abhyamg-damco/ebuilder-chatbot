import type { DynamicToolUIPart } from "ai";

export type ToolVisualPhase =
  | "preparing"
  | "sending"
  | "fetching"
  | "complete"
  | "error";

/** Map SDK tool state to a user-facing journey phase. */
export function getToolVisualPhase(
  state: DynamicToolUIPart["state"]
): ToolVisualPhase {
  switch (state) {
    case "input-streaming":
      return "preparing";
    case "input-available":
      return "fetching";
    case "output-available":
      return "complete";
    case "output-error":
    case "output-denied":
      return "error";
    default:
      return "preparing";
  }
}

export const TOOL_JOURNEY_STEPS = [
  { id: "preparing", label: "Prepare", friendly: "Getting ready" },
  { id: "sending", label: "Send", friendly: "Sending your request" },
  { id: "fetching", label: "Fetch", friendly: "Pulling live data" },
  { id: "complete", label: "Done", friendly: "All set" },
] as const;

export function isToolRunning(state: DynamicToolUIPart["state"]): boolean {
  return state === "input-streaming" || state === "input-available";
}
