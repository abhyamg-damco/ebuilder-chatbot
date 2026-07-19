import { tool, type UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import {
  artifactKinds,
  documentHandlersByArtifactKind,
} from "@/lib/artifacts/server";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

type CreateDocumentProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  modelId: string;
};

const ARTIFACT_KIND_GUIDE = `
Kind selection (Ivy / e-Builder data):
- chart: time series or comparisons (spend by month, trends). JSON with chartType, title, xKey, series[], data[], optional format.divideBy for millions.
- dashboard: KPI summary + optional table/chart (top vendors, retainage totals).
- sheet: CSV tables (bid leveling, line-item lists, over/under budget rows).
- file-preview: PDF/image preview. JSON with title, fileUrl, contentType, metadata.
- advisory-brief: invoice review only (JSON with riskRating, flags, passedChecks, recommendation).
- text/code: essays and scripts only — not for MCP query results.
`;

export const createDocument = ({
  session,
  dataStream,
  modelId,
}: CreateDocumentProps) =>
  tool({
    description: `Create a visual artifact in the side panel. ${ARTIFACT_KIND_GUIDE}`,
    inputSchema: z.object({
      title: z.string().describe("The title of the artifact"),
      kind: z
        .enum(artifactKinds)
        .describe(
          "REQUIRED. chart | dashboard | sheet | file-preview for Ivy data; advisory-brief for invoice review; code | text for writing"
        ),
      content: z
        .string()
        .optional()
        .describe(
          "Full artifact body. For chart/dashboard/file-preview/advisory-brief: valid JSON string with all fields."
        ),
    }),
    execute: async ({ title, kind, content }) => {
      const id = generateUUID();

      dataStream.write({
        type: "data-kind",
        data: kind,
        transient: true,
      });

      dataStream.write({
        type: "data-id",
        data: id,
        transient: true,
      });

      dataStream.write({
        type: "data-title",
        data: title,
        transient: true,
      });

      dataStream.write({
        type: "data-clear",
        data: null,
        transient: true,
      });

      const documentHandler = documentHandlersByArtifactKind.find(
        (documentHandlerByArtifactKind) =>
          documentHandlerByArtifactKind.kind === kind
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${kind}`);
      }

      await documentHandler.onCreateDocument({
        id,
        title,
        content,
        dataStream,
        session,
        modelId,
      });

      dataStream.write({ type: "data-finish", data: null, transient: true });

      return {
        id,
        title,
        kind,
        content:
          kind === "code"
            ? "A script was created and is now visible to the user."
            : "An insight artifact was created and is now visible to the user.",
      };
    },
  });
