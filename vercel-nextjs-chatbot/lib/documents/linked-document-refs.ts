import { denamespaceMcpToolName } from "@/lib/mcp/utils";
import { getToolPartName, isToolPart } from "@/lib/chat/tool-parts";
import { isAllowedEBuilderDownloadUrl } from "@/lib/ebuilder/download-url-policy";
import type { ChatMessage } from "@/lib/types";
import {
  asRecord,
  normalizeToolOutput,
} from "@/lib/documents/normalize-tool-output";

type JsonRecord = Record<string, unknown>;

/** Lightweight reference to an e-Builder document discovered in chat history. */
export type LinkedDocumentRef = {
  fileId?: string;
  downloadUrl?: string;
  fileName?: string;
};

export const DOCUMENT_MCP_TOOL_NAMES = new Set([
  "get_invoice_document",
  "search_documents",
]);

const DOCUMENT_MCP_TOOLS = DOCUMENT_MCP_TOOL_NAMES;

function readString(record: JsonRecord, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

/** Extract fileId / downloadUrl / fileName from a normalized MCP document record. */
function refFromDocumentRecord(record: JsonRecord): LinkedDocumentRef | null {
  const fileId = readString(record, "fileId", "FileId");
  const downloadUrl = readString(
    record,
    "downloadUrl",
    "DownloadURL",
    "fileUrl"
  );
  const fileName = readString(record, "fileName", "FileName");

  const safeUrl =
    downloadUrl && isAllowedEBuilderDownloadUrl(downloadUrl)
      ? downloadUrl
      : undefined;

  if (!fileId && !safeUrl) {
    return null;
  }

  return { fileId, downloadUrl: safeUrl, fileName };
}

function refsFromMcpToolOutput(output: unknown): LinkedDocumentRef[] {
  const record = normalizeToolOutput(output);
  if (!record) {
    return [];
  }

  const refs: LinkedDocumentRef[] = [];

  const bestMatch = asRecord(record.bestMatch);
  if (bestMatch) {
    const ref = refFromDocumentRecord(bestMatch);
    if (ref) {
      refs.push(ref);
    }
  }

  const documents = record.documents;
  if (Array.isArray(documents)) {
    for (const item of documents) {
      const docRecord = asRecord(item);
      if (!docRecord) {
        continue;
      }
      const ref = refFromDocumentRecord(docRecord);
      if (ref) {
        refs.push(ref);
      }
    }
  }

  return refs;
}

function refsFromCreateDocumentInput(input: unknown): LinkedDocumentRef[] {
  const record = asRecord(input);
  if (!record || record.kind !== "file-preview") {
    return [];
  }

  const contentRaw = record.content;
  if (typeof contentRaw !== "string" || !contentRaw.trim()) {
    return [];
  }

  try {
    const payload = JSON.parse(contentRaw) as JsonRecord;
    const metadata = asRecord(payload.metadata) ?? {};
    const fileId =
      readString(payload, "fileId") ?? readString(metadata, "fileId");
    const fileName =
      readString(metadata, "fileName") ?? readString(payload, "title");
    const downloadUrl = readString(payload, "fileUrl");

    const safeUrl =
      downloadUrl && isAllowedEBuilderDownloadUrl(downloadUrl)
        ? downloadUrl
        : undefined;

    if (!fileId && !safeUrl) {
      return [];
    }

    return [{ fileId, downloadUrl: safeUrl, fileName }];
  } catch {
    return [];
  }
}

function refKey(ref: LinkedDocumentRef): string {
  if (ref.fileId) {
    return `fileId:${ref.fileId}`;
  }
  if (ref.downloadUrl) {
    return `url:${ref.downloadUrl}`;
  }
  return `name:${ref.fileName ?? "unknown"}`;
}

/**
 * Scans chat messages for e-Builder document references from MCP tools and file-preview artifacts.
 */
export function collectLinkedDocumentRefs(
  messages: ChatMessage[]
): LinkedDocumentRef[] {
  const byKey = new Map<string, LinkedDocumentRef>();

  const addRef = (ref: LinkedDocumentRef | null) => {
    if (!ref) {
      return;
    }
    const key = refKey(ref);
    byKey.set(key, {
      ...byKey.get(key),
      ...ref,
    });
  };

  for (const message of messages) {
    for (const part of message.parts) {
      if (!isToolPart(part) || !("state" in part)) {
        continue;
      }

      if (
        part.state !== "output-available" &&
        part.state !== "input-available"
      ) {
        continue;
      }

      const toolName = denamespaceMcpToolName(getToolPartName(part));

      if (
        DOCUMENT_MCP_TOOLS.has(toolName) &&
        "output" in part &&
        part.output
      ) {
        for (const ref of refsFromMcpToolOutput(part.output)) {
          addRef(ref);
        }
      }

      if (toolName === "createDocument" && "input" in part && part.input) {
        for (const ref of refsFromCreateDocumentInput(part.input)) {
          addRef(ref);
        }
      }
    }
  }

  return [...byKey.values()];
}

export { refKey as linkedDocumentRefKey };

export function refsFromMcpToolOutputForAccess(
  output: unknown
): LinkedDocumentRef[] {
  return refsFromMcpToolOutput(output);
}
