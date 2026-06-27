import type { ChatMessage } from "@/lib/types";
import {
  formatMcpToolLabel,
  formatToolParams,
  humanizeIdentifier,
} from "@/lib/mcp/utils";
import { isToolPart } from "./tool-parts";

/** Reasoning text from model parts that appear immediately before a tool call. */
export function extractReasoningBeforeTool(
  parts: ChatMessage["parts"],
  toolPartIndex: number
): string {
  let previousToolIndex = -1;

  for (let index = toolPartIndex - 1; index >= 0; index -= 1) {
    if (isToolPart(parts[index])) {
      previousToolIndex = index;
      break;
    }
  }

  const chunks: string[] = [];

  for (let index = previousToolIndex + 1; index < toolPartIndex; index += 1) {
    const part = parts[index];

    if (
      part.type === "reasoning" &&
      "text" in part &&
      typeof part.text === "string" &&
      part.text.trim().length > 0
    ) {
      chunks.push(part.text.trim());
    }
  }

  return chunks.join("\n\n");
}

/** Condense long reasoning into a short, readable snippet. */
export function summarizeReasoningForDisplay(
  text: string,
  maxLength = 220
): string {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "";
  }

  const sentenceMatch = normalized.match(/^[\s\S]{1,220}?[.!?](?=\s|$)/);

  if (sentenceMatch && sentenceMatch[0].length <= maxLength) {
    return sentenceMatch[0].trim();
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trim()}…`;
}

/** Instant plain-language summary before the LLM explanation arrives. */
export function buildHeuristicToolReasoning(
  toolName: string,
  input: unknown
): string {
  const label = toolName.startsWith("mcp_")
    ? formatMcpToolLabel(toolName)
    : humanizeIdentifier(toolName);
  const params = formatToolParams(input);

  if (params.length === 0) {
    return `I'm reaching out to ${label} to pull live information for your request.`;
  }

  const valueSummary = params
    .slice(0, 3)
    .map((param) => {
      const value =
        param.value.length > 48
          ? `${param.value.slice(0, 48)}…`
          : param.value;
      return `${param.label.toLowerCase()} "${value}"`;
    })
    .join(", ");

  const suffix =
    params.length > 3 ? ` and ${params.length - 3} more detail(s)` : "";

  return `I'm using ${label} with ${valueSummary}${suffix} to answer your question.`;
}

/** Pick the best available short explanation for a tool call. */
export function resolveToolReasoningSummary({
  llmSummary,
  modelReasoning,
  toolName,
  input,
}: {
  llmSummary?: string | null;
  modelReasoning?: string;
  toolName: string;
  input?: unknown;
}): string {
  if (llmSummary?.trim()) {
    return llmSummary.trim();
  }

  const fromModel = summarizeReasoningForDisplay(modelReasoning ?? "");

  if (fromModel) {
    return fromModel;
  }

  return buildHeuristicToolReasoning(toolName, input);
}
