import { z } from "zod";
import type { EBuilderClient } from "../api/client.js";
import { toToolError, toToolResult } from "../api/client.js";
import { searchProjects } from "../api/project-search.js";
import { buildQueryParams, buildQueryPath } from "../api/resources.js";
import { TOOL_GUIDES } from "../prompts/domain-guides.js";
import {
  invoiceNumberFilePattern,
  normalizeDocument,
} from "./document-normalize.js";
import type { ToolRegistrar } from "./types.js";

type JsonRecord = Record<string, unknown>;

const DOCUMENT_AGENT_DIRECTIVE =
  "NEVER fabricate document content. Call createDocument(file-preview) with fileUrl (downloadUrl), previewable:true, and metadata.fileId + metadata.fileName from the best match. The UI renders via /api/documents/render?fileId=...";

function extractRecords(data: unknown): JsonRecord[] {
  if (!data || typeof data !== "object") {
    return [];
  }
  const records = (data as { records?: unknown[] }).records;
  if (!Array.isArray(records)) {
    return [];
  }
  return records.filter(
    (item): item is JsonRecord => typeof item === "object" && item !== null
  );
}

/**
 * e-Builder rejects `EQ` on Documents/Query with
 * `400 Invalid filter operation (EQ) encountered`. Exact match is the bare
 * `=` sign, verified against the tenant.
 */
const EXACT_MATCH = "=";

export type SearchDocumentsInput = {
  projectSearchTerm?: string;
  fileNamePattern?: string;
  invoiceNumber?: string;
  documentType?: string;
  fileId?: string;
  limit?: number;
};

/**
 * Search e-Builder Documents and return metadata with DownloadURL for file-preview artifacts.
 */
export async function searchDocuments(
  client: EBuilderClient,
  input: SearchDocumentsInput
): Promise<{
  status: "complete" | "partial" | "incomplete";
  documents: JsonRecord[];
  stepsCompleted: string[];
  nextSteps?: string[];
  agentDirective?: string;
}> {
  const steps: string[] = [];
  const filters: Array<{ Field: string; Operation: string; Value: string }> =
    [];

  const fileNamePattern =
    input.fileNamePattern ??
    (input.invoiceNumber
      ? invoiceNumberFilePattern(input.invoiceNumber)
      : undefined);

  /**
   * A FileId identifies one document outright, so it skips project resolution
   * and every other filter.
   *
   * This is the path the host uses to mint a fresh download URL. The signed
   * URLs e-Builder returns carry `X-Amz-Expires=1800`, so they die after
   * thirty minutes, which is shorter than the gap between someone opening a
   * chat and coming back to it. A stored URL is therefore not worth trusting
   * and the document has to be looked up again by id.
   */
  if (input.fileId) {
    filters.push({
      Field: "Document/FileId",
      Operation: EXACT_MATCH,
      Value: input.fileId,
    });
  }

  if (!input.fileId && input.projectSearchTerm) {
    steps.push(`resolve_project("${input.projectSearchTerm}")`);
    const projectResult = await searchProjects(
      client,
      input.projectSearchTerm,
      5
    );
    if (projectResult.matches.length > 0) {
      const projectName = projectResult.matches[0].projectName;
      if (projectName) {
        filters.push({
          Field: "Project/ProjectName",
          Operation: "LIKE",
          Value: projectName.includes("%") ? projectName : `%${projectName}%`,
        });
      }
    }
  }

  if (!input.fileId && fileNamePattern) {
    filters.push({
      Field: "Document/FileName",
      Operation: "LIKE",
      Value: fileNamePattern.includes("%")
        ? fileNamePattern
        : `%${fileNamePattern}%`,
    });
  }

  if (!input.fileId && input.documentType) {
    filters.push({
      Field: "Document/DocumentType",
      Operation: "LIKE",
      Value: input.documentType.includes("%")
        ? input.documentType
        : `%${input.documentType}%`,
    });
  }

  if (filters.length === 0) {
    return {
      status: "incomplete",
      documents: [],
      stepsCompleted: steps,
      nextSteps: [
        "Provide fileId for an exact document, or projectSearchTerm and/or fileNamePattern or invoiceNumber to search",
      ],
      agentDirective:
        "Ask the user for project and invoice/document name before searching Documents.",
    };
  }

  steps.push("query_records(Documents)");
  const path = buildQueryPath("Documents");
  const pageSize = input.fileId ? 1 : Math.min(input.limit ?? 20, 50);
  const params = buildQueryParams({ schema: false, pageNumber: 0, pageSize });
  const body = {
    SelectedFields: [
      "Document/FileName",
      "Document/DocumentType",
      "Document/FileId",
      "Document/FileDescription",
      "Document/FileSize",
      "Document/DownloadURL",
      "Project/ProjectName",
    ],
    Filters: filters,
  };

  const data = await client.post(path, body, params);
  const records = extractRecords(data);
  const documents = records.map(normalizeDocument);

  if (documents.length === 0) {
    return {
      status: "partial",
      documents: [],
      stepsCompleted: steps,
      nextSteps: [
        "Broaden fileNamePattern with LIKE wildcards (e.g. %invoice%)",
        "Try discover_query_schema(Documents) for tenant field names",
      ],
      agentDirective:
        "Retry with broader filters before telling user no documents exist.",
    };
  }

  return {
    status: "complete",
    documents,
    stepsCompleted: steps,
    agentDirective: DOCUMENT_AGENT_DIRECTIVE,
  };
}

export function registerSearchDocumentsTool(
  server: ToolRegistrar,
  client: EBuilderClient
): void {
  server.registerTool(
    "search_documents",
    {
      description: TOOL_GUIDES.search_documents,
      inputSchema: {
        fileId: z
          .string()
          .optional()
          .describe(
            "Exact Document/FileId. Returns that one document with a freshly signed downloadUrl, ignoring every other filter"
          ),
        projectSearchTerm: z
          .string()
          .optional()
          .describe("Project name/code to scope document search"),
        fileNamePattern: z
          .string()
          .optional()
          .describe("LIKE pattern for Document/FileName (e.g. %invoice%)"),
        invoiceNumber: z
          .string()
          .optional()
          .describe(
            "Invoice number — auto-builds fileNamePattern (e.g. 006 → %006%)"
          ),
        documentType: z
          .string()
          .optional()
          .describe("Optional Document/DocumentType filter"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe("Max documents to return (default 20)"),
      },
    },
    async (args) => {
      try {
        const result = await searchDocuments(client, {
          fileId: args.fileId as string | undefined,
          projectSearchTerm: args.projectSearchTerm as string | undefined,
          fileNamePattern: args.fileNamePattern as string | undefined,
          invoiceNumber: args.invoiceNumber as string | undefined,
          documentType: args.documentType as string | undefined,
          limit: args.limit as number | undefined,
        });

        return toToolResult({
          status: result.status,
          documents: result.documents,
          count: result.documents.length,
          stepsCompleted: result.stepsCompleted,
          nextSteps: result.nextSteps,
          agentDirective: result.agentDirective,
        });
      } catch (error) {
        return toToolError(
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  );
}
