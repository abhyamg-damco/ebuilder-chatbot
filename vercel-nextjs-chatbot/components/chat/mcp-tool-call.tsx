"use client";

import type { DynamicToolUIPart } from "ai";
import { resolveToolReasoningSummary, summarizeReasoningForDisplay } from "@/lib/chat/tool-reasoning";
import {
  formatMcpToolLabel,
  formatToolOutput,
  formatToolParams,
  getMcpToolActionLabel,
} from "@/lib/mcp/utils";
import { useToolReasoningFromStream } from "@/hooks/use-tool-reasoning";
import { isToolRunning } from "@/lib/chat/tool-journey";
import { ToolJourneyCard } from "./tool-journey-card";

type McpToolCallProps = {
  toolCallId: string;
  toolName: string;
  state: DynamicToolUIPart["state"];
  input?: unknown;
  output?: unknown;
  errorText?: string;
  modelReasoning?: string;
};

/** MCP tool call — animated journey card tuned for connected services. */
export function McpToolCall({
  toolCallId,
  toolName,
  state,
  input,
  output,
  errorText,
  modelReasoning = "",
}: McpToolCallProps) {
  const llmSummary = useToolReasoningFromStream(toolCallId);
  const toolLabel = formatMcpToolLabel(toolName);
  const actionLabel = getMcpToolActionLabel(toolName, state);
  const params = formatToolParams(input);
  const formattedOutput =
    state === "output-available" && output !== undefined
      ? formatToolOutput(output)
      : null;

  const reasoningSummary = resolveToolReasoningSummary({
    llmSummary,
    modelReasoning,
    toolName,
    input,
  });

  const modelSnippet = summarizeReasoningForDisplay(modelReasoning);

  return (
    <ToolJourneyCard
      badge="Connected service"
      errorText={errorText}
      formattedOutput={formattedOutput}
      icon="mcp"
      input={input}
      isReasoningLoading={isToolRunning(state) && !llmSummary}
      modelReasoningSnippet={
        modelSnippet && modelSnippet !== reasoningSummary
          ? modelSnippet
          : undefined
      }
      output={output}
      params={params}
      reasoningSummary={reasoningSummary}
      state={state}
      subtitle={actionLabel}
      title={toolLabel}
    />
  );
}
