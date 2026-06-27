import type { ChatMessage } from "@/lib/types";

type MessagePart = ChatMessage["parts"][number];

/** Whether a message part represents a tool invocation. */
export function isToolPart(part: MessagePart): boolean {
  return part.type === "dynamic-tool" || part.type.startsWith("tool-");
}

/** Whether a tool part is an MCP namespaced tool. */
export function isMcpToolPart(part: MessagePart): boolean {
  if (part.type === "dynamic-tool" && "toolName" in part) {
    return part.toolName.startsWith("mcp_");
  }

  return part.type.startsWith("tool-mcp_");
}

/** Resolve the canonical tool identifier for display. */
export function getToolPartName(part: MessagePart): string {
  if (part.type === "dynamic-tool" && "toolName" in part) {
    return part.toolName;
  }

  return part.type.replace(/^tool-/, "");
}

/** Whether the tool is still executing. */
export function isToolPartRunning(part: MessagePart): boolean {
  if (!isToolPart(part) || !("state" in part)) {
    return false;
  }

  return part.state === "input-streaming" || part.state === "input-available";
}

/** Count in-flight tool calls on an assistant message. */
export function getActiveToolCount(parts: MessagePart[]): number {
  return parts.filter(isToolPartRunning).length;
}
