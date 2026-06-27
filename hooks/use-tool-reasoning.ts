"use client";

import { useMemo } from "react";
import { useDataStream } from "@/components/chat/data-stream-provider";

/** Look up streamed LLM-generated reasoning for a specific tool call. */
export function useToolReasoningFromStream(toolCallId: string): string | null {
  const { dataStream } = useDataStream();

  return useMemo(() => {
    const matches = dataStream.filter(
      (part) =>
        part.type === "data-tool-reasoning" &&
        part.data.toolCallId === toolCallId
    );

    const latest = matches.at(-1);

    return latest?.type === "data-tool-reasoning"
      ? latest.data.summary
      : null;
  }, [dataStream, toolCallId]);
}
