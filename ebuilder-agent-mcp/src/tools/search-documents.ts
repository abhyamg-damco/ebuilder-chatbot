import { z } from "zod";
import type { EBuilderClient } from "../api/client.js";
import { toToolError, toToolResult } from "../api/client.js";
import { searchProjects } from "../api/project-search.js";
import { buildQueryParams, buildQueryPath } from "../api/resources.js";
import { TOOL_GUIDES } from "../prompts/domain-guides.js";
import type { ToolRegistrar } from "./types.js";

type JsonRecord = Record<string, unknown>;

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

function normalizeDocument(record: JsonRecord): JsonRecord {
  const doc = (record.Document as JsonRecord | undefined) ?? record;
  const fileName = String(doc.FileName ?? doc.fileName ?? "");
  const fileId = String(doc.FileId ?? doc.fileId ?? "");
  const documentType = String(doc.DocumentType ?? doc.documentType ?? "");
  const fileDescription = String(
    doc.FileDescription ?? doc.fileDescription ?? ""
  );

  return {
    fileName,
    fileId,
    documentType,
    fileDescription,
    ref: fileId ? `Documents/${fileId}` : undefined,
    previewPath: fileId ? `/api/documents/preview?fileId=${encodeURIComponent(fileId)}` : undefined,
  };
}

/**
 * Search e-Builder Documents and return metadata for file-preview artifacts.
 */
export async function searchDocuments(
  client: EBuilderClient,
  input: {
    projectSearchTerm?: string;
    fileNamePattern?: string;
    documentType?: string;
    limit?: number;
  }
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

  if (input.projectSearchTerm) {
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

  if (input.fileNamePattern) {
    filters.push({
      Field: "Document/FileName",
      Operation: "LIKE",
      Value: input.fileNamePattern.includes("%")
        ? input.fileNamePattern
        : `%${input.fileNamePattern}%`,
    });
  }

  if (input.documentType) {
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
        "Provide projectSearchTerm and/or fileNamePattern (e.g. invoice PDF name)",
      ],
      agentDirective:
        "Ask the user for project and document name before searching Documents.",
    };
  }

  steps.push("query_records(Documents)");
  const path = buildQueryPath("Documents");
  const pageSize = Math.min(input.limit ?? 20, 50);
  const params = buildQueryParams({ schema: false, pageNumber: 0, pageSize });
  const body = {
    SelectedFields: [
      "Document/FileName",
      "Document/DocumentType",
      "Document/FileId",
      "Document/FileDescription",
      "Document/FileSize",
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
        "Broaden fileNamePattern with LIKE wildcards",
        "Try discover_query_schema(Documents) for tenant field names",
      ],
      agentDirective: "Retry with broader filters before telling user no documents exist.",
    };
  }

  return {
    status: "complete",
    documents,
    stepsCompleted: steps,
    agentDirective:
      "Use the latest matching document previewPath as fileUrl in createDocument(file-preview). Include fileName and documentType in metadata.",
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
        projectSearchTerm: z
          .string()
          .optional()
          .describe("Project name/code to scope document search"),
        fileNamePattern: z
          .string()
          .optional()
          .describe("LIKE pattern for Document/FileName (e.g. %invoice%)"),
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
          projectSearchTerm: args.projectSearchTerm as string | undefined,
          fileNamePattern: args.fileNamePattern as string | undefined,
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
