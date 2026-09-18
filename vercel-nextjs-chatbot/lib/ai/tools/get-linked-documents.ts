import { tool } from "ai";
import { z } from "zod";

import type { DocumentAccessInfo } from "@/lib/documents/access";
import { TEXT_PREVIEW_MAX_CHARS } from "@/lib/storage/extract-text";
import type { UploadAccessInfo } from "@/lib/chat/uploads";
import { fetchLinkedDocumentByRef } from "@/lib/documents/linked-documents";
import type { LinkedDocumentRef } from "@/lib/documents/linked-document-refs";

type GetLinkedDocumentsToolOptions = {
  chatId: string;
  uploads: UploadAccessInfo[];
  /** Mutable list — updated when MCP prefetch or tool refresh runs in the same request. */
  linkedDocuments: DocumentAccessInfo[];
};

function mapUpload(upload: UploadAccessInfo) {
  return {
    id: upload.id,
    source: "upload" as const,
    filename: upload.originalFilename,
    mimeType: upload.mimeType,
    category: upload.category,
    url: upload.url || undefined,
    extractedTextPreview: upload.extractedTextPreview,
    pageCount: upload.pageCount,
    truncated: upload.extractedTextPreview
      ? upload.extractedTextPreview.length >= TEXT_PREVIEW_MAX_CHARS
      : undefined,
  };
}

function mapLinked(doc: DocumentAccessInfo) {
  return {
    id: doc.id,
    source: doc.source,
    filename: doc.fileName,
    mimeType: doc.mimeType,
    category: doc.category,
    fileId: doc.fileId,
    downloadUrl: doc.downloadUrl,
    extractedTextPreview: doc.extractedTextPreview,
    pageCount: doc.pageCount,
    truncated: doc.truncated,
    supported: doc.supported,
    unsupportedReason: doc.unsupportedReason,
  };
}

/**
 * Unified document access tool — chat uploads and e-Builder linked documents.
 */
export function createGetLinkedDocumentsTool({
  chatId,
  uploads,
  linkedDocuments,
}: GetLinkedDocumentsToolOptions) {
  return tool({
    description:
      "Returns extracted text from chat uploads and e-Builder linked documents. Call when you need to read document contents, refresh after MCP document tools, or when extracted text in the system prompt is truncated. Provide fileId or downloadUrl to fetch a specific e-Builder document.",
    inputSchema: z.object({
      fileId: z
        .string()
        .optional()
        .describe("e-Builder FileId from get_invoice_document or search_documents"),
      downloadUrl: z
        .string()
        .optional()
        .describe("Signed e-Builder DownloadURL when fileId is unavailable"),
      fileName: z
        .string()
        .optional()
        .describe("Optional file name hint for extraction"),
      uploadId: z
        .string()
        .optional()
        .describe("Refresh a specific chat upload by upload ID"),
    }),
    execute: async ({ fileId, downloadUrl, fileName, uploadId }) => {
      let fetchStatus: "ok" | "fetch_failed" | "no_text" | "not_requested" =
        "not_requested";
      let fetchError: string | undefined;

      if (fileId || downloadUrl) {
        const ref: LinkedDocumentRef = {
          fileId,
          downloadUrl,
          fileName,
        };
        const fetched = await fetchLinkedDocumentByRef({ chatId, ref });
        if (!fetched) {
          fetchStatus = "fetch_failed";
          fetchError =
            "Could not download the document from e-Builder. Verify fileId/downloadUrl and server EBUILDER credentials.";
        } else if (
          !fetched.extractedTextPreview &&
          !fetched.supported
        ) {
          fetchStatus = "no_text";
          fetchError =
            fetched.unsupportedReason ??
            "Document downloaded but no text could be extracted.";
          const index = linkedDocuments.findIndex((doc) => doc.id === fetched.id);
          if (index >= 0) {
            linkedDocuments[index] = fetched;
          } else {
            linkedDocuments.push(fetched);
          }
        } else {
          fetchStatus = "ok";
          const index = linkedDocuments.findIndex((doc) => doc.id === fetched.id);
          if (index >= 0) {
            linkedDocuments[index] = fetched;
          } else {
            linkedDocuments.push(fetched);
          }
        }
      }

      const uploadList =
        uploadId !== undefined
          ? uploads.filter((upload) => upload.id === uploadId)
          : uploads;

      return {
        status: fetchStatus,
        error: fetchError,
        uploadCount: uploadList.length,
        linkedDocumentCount: linkedDocuments.length,
        uploads: uploadList.map(mapUpload),
        linkedDocuments: linkedDocuments.map(mapLinked),
      };
    },
  });
}
