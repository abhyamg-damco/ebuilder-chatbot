import { z } from "zod";
import type { EBuilderClient } from "../api/client.js";
import { toToolError, toToolResult } from "../api/client.js";
import { searchProjects } from "../api/project-search.js";
import { buildQueryParams, buildQueryPath } from "../api/resources.js";
import { TOOL_GUIDES } from "../prompts/domain-guides.js";
import type { ToolRegistrar } from "./types.js";
import { searchDocuments } from "./search-documents.js";

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

async function queryCommitmentInvoiceSummary(
  client: EBuilderClient,
  invoiceNumber: string,
  portalId?: string
): Promise<JsonRecord | null> {
  const filters: Array<{ Field: string; Operation: string; Value: string }> = [
    {
      Field: "CommitmentInvoice/InvoiceNumber",
      Operation: "LIKE",
      Value: invoiceNumber.includes("%") ? invoiceNumber : `%${invoiceNumber}%`,
    },
  ];

  if (portalId) {
    filters.push({
      Field: "CommitmentInvoice/PortalId",
      Operation: "EQ",
      Value: portalId,
    });
  }

  const path = buildQueryPath("CommitmentInvoices");
  const params = buildQueryParams({ schema: false, pageNumber: 0, pageSize: 5 });
  const body = {
    SelectedFields: [
      "CommitmentInvoice/CommitmentInvoiceId",
      "CommitmentInvoice/InvoiceNumber",
      "CommitmentInvoice/InvoiceAmount",
      "CommitmentInvoice/Description",
      "CommitmentInvoice/CommitmentId",
      "CommitmentInvoice/PortalId",
      "Project/ProjectName",
    ],
    Filters: filters,
  };

  const data = await client.post(path, body, params);
  const records = extractRecords(data);
  if (records.length === 0) {
    return null;
  }

  const record = records[0];
  const header =
    (record.CommitmentInvoice as JsonRecord | undefined) ?? record;
  const project =
    (record.Project as JsonRecord | undefined) ?? {};

  return {
    commitmentInvoiceId: String(header.CommitmentInvoiceId ?? ""),
    invoiceNumber: String(header.InvoiceNumber ?? ""),
    invoiceAmount: String(header.InvoiceAmount ?? ""),
    description: String(header.Description ?? ""),
    commitmentId: String(header.CommitmentId ?? ""),
    projectName: String(project.ProjectName ?? ""),
  };
}

function pickBestDocument(documents: JsonRecord[]): JsonRecord | undefined {
  if (documents.length === 0) {
    return undefined;
  }

  const withUrl = documents.find(
    (doc) => typeof doc.fileUrl === "string" && doc.fileUrl.length > 0
  );
  return withUrl ?? documents[0];
}

export type GetInvoiceDocumentInput = {
  invoiceNumber?: string;
  projectSearchTerm?: string;
  fileNamePattern?: string;
  limit?: number;
};

/**
 * Resolve an invoice in PMIS and find its uploaded document with a real download URL.
 */
export async function getInvoiceDocument(
  client: EBuilderClient,
  input: GetInvoiceDocumentInput
): Promise<{
  status: "complete" | "partial" | "incomplete";
  invoice?: JsonRecord | null;
  documents: JsonRecord[];
  bestMatch?: JsonRecord;
  stepsCompleted: string[];
  nextSteps?: string[];
  agentDirective?: string;
}> {
  const steps: string[] = [];
  let portalId: string | undefined;
  let invoice: JsonRecord | null = null;

  if (
    !input.invoiceNumber &&
    !input.projectSearchTerm &&
    !input.fileNamePattern
  ) {
    return {
      status: "incomplete",
      invoice,
      documents: [],
      stepsCompleted: steps,
      nextSteps: [
        "Provide invoiceNumber and projectSearchTerm",
        "Or call search_documents with fileNamePattern directly",
      ],
      agentDirective:
        "Ask the user for invoice number and project, then retry get_invoice_document.",
    };
  }

  if (input.projectSearchTerm) {
    steps.push(`resolve_project("${input.projectSearchTerm}")`);
    const projectResult = await searchProjects(
      client,
      input.projectSearchTerm,
      5
    );
    if (projectResult.matches.length > 0) {
      portalId = projectResult.matches[0].portalId;
    }
  }

  if (input.invoiceNumber) {
    steps.push(`query_records(CommitmentInvoices) for invoice ${input.invoiceNumber}`);
    invoice = await queryCommitmentInvoiceSummary(
      client,
      input.invoiceNumber,
      portalId
    );
  }

  const searchPatterns = [
    input.fileNamePattern,
    input.invoiceNumber ? `%${input.invoiceNumber.replace(/^#+/, "")}%` : undefined,
    "%invoice%",
  ].filter((pattern): pattern is string => Boolean(pattern));

  let documents: JsonRecord[] = [];
  let lastSearchResult: Awaited<ReturnType<typeof searchDocuments>> | undefined;

  for (const pattern of searchPatterns) {
    steps.push(`search_documents(fileNamePattern=${pattern})`);
    lastSearchResult = await searchDocuments(client, {
      projectSearchTerm: input.projectSearchTerm,
      fileNamePattern: pattern,
      limit: input.limit ?? 10,
    });
    documents = lastSearchResult.documents;
    if (documents.length > 0) {
      break;
    }
  }

  const bestMatch = pickBestDocument(documents);

  if (bestMatch?.fileUrl) {
    return {
      status: "complete",
      invoice,
      documents,
      bestMatch,
      stepsCompleted: steps,
      agentDirective:
        "Call createDocument(file-preview) using ONLY bestMatch fields: fileUrl=bestMatch.fileUrl (or downloadUrl), fileId=bestMatch.fileId, contentType=bestMatch.contentType, previewable:true, metadata.fileId=bestMatch.fileId, metadata.fileName=bestMatch.fileName, metadata.source='e-Builder Documents'. For document content Q&A, host calls getLinkedDocuments with bestMatch.fileId or downloadUrl. Do NOT use UUIDs or filenames from system prompt examples. NEVER fabricate invoice PDF content.",
    };
  }

  if (documents.length > 0) {
    return {
      status: "partial",
      invoice,
      documents,
      bestMatch,
      stepsCompleted: steps,
      nextSteps: [
        "Documents found but missing DownloadURL — retry search_documents or use previewPath as fileUrl fallback",
      ],
      agentDirective:
        "Use previewPath as fileUrl fallback in createDocument(file-preview) if downloadUrl is absent.",
    };
  }

  if (invoice) {
    return {
      status: "partial",
      invoice,
      documents: [],
      stepsCompleted: steps,
      nextSteps: lastSearchResult?.nextSteps ?? [
        "Broaden fileNamePattern",
        "Ask user for exact uploaded file name",
      ],
      agentDirective:
        "Invoice exists in PMIS but no matching document found. Retry search_documents with broader patterns before responding.",
    };
  }

  return {
    status: "incomplete",
    invoice,
    documents: [],
    stepsCompleted: steps,
    nextSteps: [
      "Provide invoiceNumber and projectSearchTerm",
      "Or call search_documents with fileNamePattern directly",
    ],
    agentDirective:
      "Ask the user for invoice number and project, then retry get_invoice_document.",
  };
}

export function registerGetInvoiceDocumentTool(
  server: ToolRegistrar,
  client: EBuilderClient
): void {
  server.registerTool(
    "get_invoice_document",
    {
      description: TOOL_GUIDES.get_invoice_document,
      inputSchema: {
        invoiceNumber: z
          .string()
          .optional()
          .describe("Invoice number as user stated (e.g. 006, #6)"),
        projectSearchTerm: z
          .string()
          .optional()
          .describe("Project name/code to scope invoice and document search"),
        fileNamePattern: z
          .string()
          .optional()
          .describe("Optional override LIKE pattern for Document/FileName"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe("Max documents to return (default 10)"),
      },
    },
    async (args) => {
      try {
        const result = await getInvoiceDocument(client, {
          invoiceNumber: args.invoiceNumber as string | undefined,
          projectSearchTerm: args.projectSearchTerm as string | undefined,
          fileNamePattern: args.fileNamePattern as string | undefined,
          limit: args.limit as number | undefined,
        });

        return toToolResult({
          status: result.status,
          invoice: result.invoice,
          documents: result.documents,
          bestMatch: result.bestMatch,
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
