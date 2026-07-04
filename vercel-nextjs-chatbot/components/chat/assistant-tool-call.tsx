"use client";

import type { DynamicToolUIPart } from "ai";
import {
  resolveToolReasoningSummary,
  summarizeReasoningForDisplay,
} from "@/lib/chat/tool-reasoning";
import { isToolRunning } from "@/lib/chat/tool-journey";
import {
  formatToolOutput,
  formatToolParams,
  humanizeIdentifier,
} from "@/lib/mcp/utils";
import { useToolReasoningFromStream } from "@/hooks/use-tool-reasoning";
import { ToolJourneyCard } from "./tool-journey-card";

type AssistantToolCallProps = {
  toolCallId: string;
  toolName: string;
  state: DynamicToolUIPart["state"];
  input?: unknown;
  output?: unknown;
  errorText?: string;
  modelReasoning?: string;
};

function getActionLabel(toolName: string, state: string): string {
  const label = humanizeIdentifier(toolName);

  switch (state) {
    case "input-streaming":
      return `Getting ${label} ready…`;
    case "input-available":
      return `Running ${label}…`;
    case "output-available":
      return `${label} completed successfully`;
    case "output-error":
      return `${label} could not finish`;
    default:
      return label;
  }
}

/** Built-in assistant tool — same animated journey experience as MCP tools. */
export function AssistantToolCall({
  toolCallId,
  toolName,
  state,
  input,
  output,
  errorText,
  modelReasoning = "",
}: AssistantToolCallProps) {
  const llmSummary = useToolReasoningFromStream(toolCallId);
  const label = humanizeIdentifier(toolName);
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
      badge="Assistant tool"
      errorText={errorText}
      formattedOutput={formattedOutput}
      icon="builtin"
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
      subtitle={getActionLabel(toolName, state)}
      title={label}
    />
  );
}
