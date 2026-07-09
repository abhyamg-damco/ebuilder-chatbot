import {
  buildHeuristicToolReasoning,
  summarizeReasoningForDisplay,
} from "@/lib/chat/tool-reasoning";
import { humanizeIdentifier } from "@/lib/mcp/utils";

type FormatOptions = {
  redact?: (text: string) => string;
};

function redactText(text: string, redact?: (text: string) => string): string {
  return redact ? redact(text) : text;
}

function hostnameFromUrl(url: string): string | undefined {
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

function truncate(text: string, maxLength = 80): string {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trim()}…`;
}

function instructionFromInput(input: unknown): string | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const record = input as Record<string, unknown>;

  if (typeof record.instruction === "string") {
    return record.instruction;
  }

  if (typeof record.action === "string") {
    return record.action;
  }

  if (typeof record.text === "string") {
    return record.text;
  }

  return undefined;
}

function urlFromInput(input: unknown): string | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const record = input as Record<string, unknown>;

  if (typeof record.url === "string") {
    return record.url;
  }

  return undefined;
}

/** Human-readable line for browserNavigate start. */
export function formatBrowserNavigateStart(
  url: string,
  options?: FormatOptions
): string {
  const safeUrl = redactText(url, options?.redact);
  const host = hostnameFromUrl(safeUrl) ?? safeUrl;

  return `Opening ${host}…`;
}

/** Human-readable line for browserNavigate completion. */
export function formatBrowserNavigateDone(pageTitle?: string): string {
  if (pageTitle?.trim()) {
    return `Page loaded: ${truncate(pageTitle, 60)}`;
  }

  return "Page loaded";
}

/** Human-readable line for a single browserAct instruction. */
export function formatBrowserActMessage(
  instruction: string,
  options?: FormatOptions
): string {
  const safe = redactText(instruction, options?.redact);
  const lower = safe.toLowerCase();

  if (lower.includes("click")) {
    return truncate(safe.charAt(0).toUpperCase() + safe.slice(1));
  }

  if (lower.includes("type") || lower.includes("fill") || lower.includes("enter")) {
    return truncate(safe.charAt(0).toUpperCase() + safe.slice(1));
  }

  return truncate(`Performing: ${safe}`);
}

/** Human-readable line for browserExtract. */
export function formatBrowserExtractMessage(
  instruction: string,
  options?: FormatOptions
): string {
  const safe = redactText(instruction, options?.redact);
  return `Reading page: ${truncate(safe, 70)}`;
}

/** Human-readable line for browserAgent start. */
export function formatBrowserAgentStart(
  instruction: string,
  options?: FormatOptions
): string {
  const safe = redactText(instruction, options?.redact);

  const lower = safe.toLowerCase();

  if (
    lower.includes("login") ||
    lower.includes("log in") ||
    lower.includes("sign in")
  ) {
    return "Starting login flow…";
  }

  return `Running automation: ${truncate(safe, 70)}`;
}

/** Human-readable line for a Stagehand agent sub-step tool call. */
export function formatBrowserAgentStep(
  toolName: string,
  input: unknown,
  options?: FormatOptions
): string {
  const name = toolName.toLowerCase();
  const instruction = instructionFromInput(input);
  const url = urlFromInput(input);

  if (name === "goto" && url) {
    const host = hostnameFromUrl(redactText(url, options?.redact)) ?? "page";
    return `Navigating to ${host}`;
  }

  if (name === "fillform" || name === "fillformvision") {
    return "Filling in form fields…";
  }

  if (name === "act" && instruction) {
    return formatBrowserActMessage(instruction, options);
  }

  if (name === "click" || name === "type") {
    return `${humanizeIdentifier(toolName)} on page`;
  }

  if (name === "extract" || name === "ariatree") {
    return "Inspecting page content…";
  }

  if (name === "screenshot") {
    return "Capturing page screenshot…";
  }

  if (name === "scroll") {
    return "Scrolling page…";
  }

  if (name === "wait") {
    return "Waiting for page to update…";
  }

  if (name === "think") {
    return "Planning next step…";
  }

  if (name === "done") {
    return "Task complete";
  }

  if (name === "keys") {
    return "Pressing keyboard keys…";
  }

  if (name === "navback") {
    return "Going back…";
  }

  if (name === "search") {
    return "Searching the web…";
  }

  if (instruction) {
    return truncate(redactText(instruction, options?.redact));
  }

  return humanizeIdentifier(toolName);
}

/** Human-readable line from AgentResult.actions fallback. */
export function formatBrowserAgentAction(action: {
  type?: string;
  action?: string;
  instruction?: string;
  reasoning?: string;
  taskCompleted?: boolean;
}): string | null {
  if (action.type === "done" || action.taskCompleted) {
    return "Task complete";
  }

  if (typeof action.instruction === "string" && action.instruction.trim()) {
    return truncate(action.instruction);
  }

  if (typeof action.action === "string" && action.action.trim()) {
    return truncate(action.action);
  }

  if (typeof action.reasoning === "string" && action.reasoning.trim()) {
    return truncate(summarizeReasoningForDisplay(action.reasoning, 90));
  }

  if (action.type) {
    return humanizeIdentifier(action.type);
  }

  return null;
}

/** Human-readable line for generic tool calls in onStepFinish. */
export function formatToolActivityMessage(
  toolName: string,
  input: unknown
): string {
  return buildHeuristicToolReasoning(toolName, input);
}

/** Condensed model thinking line for the activity feed. */
export function formatThinkingActivityMessage(reasoningText: string): string {
  const summary = summarizeReasoningForDisplay(reasoningText, 100);

  if (!summary) {
    return "Planning next steps…";
  }

  return summary;
}

/** Human-readable lines for browser search tools. */
export function formatBrowserSearchStart(query: string): string {
  return `Searching for "${truncate(query, 50)}"…`;
}

export function formatBrowserSearchOpenDone(title?: string): string {
  if (title?.trim()) {
    return `Opened: ${truncate(title, 60)}`;
  }

  return "Opened search result";
}

export function formatBrowserSyncUploadsStart(): string {
  return "Syncing files to browser session…";
}

export function formatBrowserAttachFileStart(selector: string): string {
  return `Attaching file to ${truncate(selector, 40)}…`;
}

export function formatCloseBrowserMessage(): string {
  return "Closing browser session";
}
