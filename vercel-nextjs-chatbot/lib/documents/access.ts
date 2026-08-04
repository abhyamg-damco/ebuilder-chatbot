import "server-only";

import type { ChatUpload } from "@/lib/db/schema";
import {
  fetchEBuilderDocumentByDownloadUrl,
  fetchEBuilderDocumentByFileId,
  inferContentTypeFromFileName,
} from "@/lib/ebuilder/documents";
import { downloadFromGcs } from "@/lib/storage/upload";
import { extractTextPreview } from "@/lib/storage/extract-text";
import {
  getUploadCategory,
  isAllowedMimeType,
  type AllowedMimeType,
} from "@/lib/storage/mime";

/** Origin of a document available to the agent. */
export type DocumentSourceKind = "upload" | "ebuilder" | "ebuilder-url";

export type DocumentSource =
  | { kind: "upload"; uploadId: string; upload: ChatUpload }
  | { kind: "ebuilder"; fileId: string; fileName?: string }
  | {
      kind: "ebuilder-url";
      downloadUrl: string;
      fileId?: string;
      fileName?: string;
    };

/** Unified document metadata + extracted text for agent context. */
export type DocumentAccessInfo = {
  id: string;
  source: DocumentSourceKind;
  fileName: string;
  mimeType: string;
  category: "image" | "document";
  url?: string;
  extractedTextPreview?: string;
  pageCount?: number;
  truncated?: boolean;
  supported: boolean;
  unsupportedReason?: string;
  fileId?: string;
  downloadUrl?: string;
};

/**
 * Maps a content type string and file name to an allowed MIME type when possible.
 */
export function resolveAllowedMimeType(
  mimeType: string,
  fileName: string
): AllowedMimeType | null {
  const normalized = mimeType.split(";").at(0)?.trim().toLowerCase() ?? "";

  if (isAllowedMimeType(normalized)) {
    return normalized;
  }

  const fromName = inferContentTypeFromFileName(fileName);
  if (isAllowedMimeType(fromName)) {
    return fromName;
  }

  return null;
}

function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

/**
 * Extracts agent-readable text from a document buffer using the shared preview pipeline.
 */
export async function extractDocumentTextFromBuffer({
  buffer,
  mimeType,
  fileName,
}: {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}): Promise<Pick<
  DocumentAccessInfo,
  | "extractedTextPreview"
  | "pageCount"
  | "truncated"
  | "supported"
  | "unsupportedReason"
  | "category"
  | "mimeType"
>> {
  const category = isImageMimeType(mimeType) ? "image" : "document";
  const allowedMime = resolveAllowedMimeType(mimeType, fileName);

  if (!allowedMime) {
    return {
      mimeType,
      category,
      supported: false,
      unsupportedReason: `Unsupported document type: ${mimeType || "unknown"}`,
    };
  }

  const extracted = await extractTextPreview({
    buffer,
    mimeType: allowedMime,
    category: getUploadCategory(allowedMime),
  });

  return {
    mimeType: allowedMime,
    category: getUploadCategory(allowedMime),
    extractedTextPreview: extracted.extractedTextPreview,
    pageCount: extracted.pageCount,
    truncated: extracted.truncated,
    supported: extracted.supported ?? Boolean(extracted.extractedTextPreview),
    unsupportedReason: extracted.unsupportedReason,
  };
}

/**
 * Fetches document bytes and extracts text for any supported source (upload, fileId, URL).
 */
export async function resolveDocumentContent(
  source: DocumentSource
): Promise<DocumentAccessInfo | null> {
  if (source.kind === "upload") {
    const { upload } = source;
    if (!upload.bucket) {
      return null;
    }

    try {
      const buffer = await downloadFromGcs({
        bucket: upload.bucket,
        objectPath: upload.objectPath,
      });

      const extracted = await extractDocumentTextFromBuffer({
        buffer,
        mimeType: upload.mimeType,
        fileName: upload.originalFilename,
      });

      return {
        id: upload.id,
        source: "upload",
        fileName: upload.originalFilename,
        ...extracted,
      };
    } catch {
      return null;
    }
  }

  if (source.kind === "ebuilder") {
    const fetched = await fetchEBuilderDocumentByFileId(source.fileId);
    if (!fetched) {
      return null;
    }

    const fileName = source.fileName ?? fetched.fileName;
    const extracted = await extractDocumentTextFromBuffer({
      buffer: fetched.buffer,
      mimeType: fetched.contentType,
      fileName,
    });

    return {
      id: source.fileId,
      source: "ebuilder",
      fileName,
      fileId: source.fileId,
      ...extracted,
    };
  }

  const fetched = await fetchEBuilderDocumentByDownloadUrl(
    source.downloadUrl,
    source.fileName ?? "document"
  );
  if (!fetched) {
    return null;
  }

  const fileName = source.fileName ?? fetched.fileName;
  const extracted = await extractDocumentTextFromBuffer({
    buffer: fetched.buffer,
    mimeType: fetched.contentType,
    fileName,
  });

  return {
    id: source.fileId ?? source.downloadUrl,
    source: "ebuilder-url",
    fileName,
    fileId: source.fileId,
    downloadUrl: source.downloadUrl,
    ...extracted,
  };
}
