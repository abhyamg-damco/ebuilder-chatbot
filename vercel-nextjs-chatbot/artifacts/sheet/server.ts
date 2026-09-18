import { streamText } from "ai";
import { sheetPrompt, updateDocumentPrompt } from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import { createDocumentHandler } from "@/lib/artifacts/server";
import { getArtifactTelemetrySettings } from "@/lib/observability/langfuse";

export const sheetDocumentHandler = createDocumentHandler<"sheet">({
  kind: "sheet",
  onCreateDocument: async ({ title, content, dataStream, modelId }) => {
    /**
     * When the agent has already assembled the rows, use them.
     *
     * Without this the title alone was handed to a second model that has never
     * seen the conversation or the tool results, so it invented a plausible
     * spreadsheet: real-looking project codes, names and owners that exist
     * nowhere in the tenant. The chart, dashboard, file-preview and
     * advisory-brief handlers all honour `content` already. Generating from the
     * title is only correct when there is nothing to render.
     */
    if (content) {
      dataStream.write({
        type: "data-sheetDelta",
        data: content,
        transient: true,
      });
      return content;
    }

    let draftContent = "";

    const { fullStream } = streamText({
      model: getLanguageModel(modelId),
      system: `${sheetPrompt}\n\nOutput ONLY the raw CSV data. No explanations, no markdown fences.`,
      prompt: title,
      experimental_telemetry: getArtifactTelemetrySettings("sheet", modelId),
    });

    for await (const delta of fullStream) {
      if (delta.type === "text-delta") {
        draftContent += delta.text;
        dataStream.write({
          type: "data-sheetDelta",
          data: draftContent,
          transient: true,
        });
      }
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream, modelId }) => {
    let draftContent = "";

    const { fullStream } = streamText({
      model: getLanguageModel(modelId),
      system: `${updateDocumentPrompt(document.content, "sheet")}\n\nOutput ONLY the raw CSV data. No explanations, no markdown fences.`,
      prompt: description,
      experimental_telemetry: getArtifactTelemetrySettings("sheet", modelId),
    });

    for await (const delta of fullStream) {
      if (delta.type === "text-delta") {
        draftContent += delta.text;
        dataStream.write({
          type: "data-sheetDelta",
          data: draftContent,
          transient: true,
        });
      }
    }

    return draftContent;
  },
});
