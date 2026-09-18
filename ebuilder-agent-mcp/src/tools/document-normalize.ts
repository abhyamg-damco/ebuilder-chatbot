type JsonRecord = Record<string, unknown>;

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

const INLINE_PREVIEW_EXTENSIONS = new Set([
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "doc",
  "docx",
]);

/** Infer MIME type from a document file name extension. */
export function inferContentTypeFromFileName(fileName: string): string | undefined {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (!extension) {
    return undefined;
  }
  return EXTENSION_CONTENT_TYPES[extension];
}

/** Whether the file type supports inline iframe/img preview in the chat UI. */
export function isPreviewableFileName(fileName: string): boolean {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (!extension) {
    return false;
  }
  return INLINE_PREVIEW_EXTENSIONS.has(extension);
}

/** Normalize a Documents Query record into artifact-ready metadata with download URLs. */
export function normalizeDocument(record: JsonRecord): JsonRecord {
  const doc = (record.Document as JsonRecord | undefined) ?? record;
  const fileName = String(doc.FileName ?? doc.fileName ?? "");
  const fileId = String(doc.FileId ?? doc.fileId ?? "");
  const documentType = String(doc.DocumentType ?? doc.documentType ?? "");
  const fileDescription = String(
    doc.FileDescription ?? doc.fileDescription ?? ""
  );
  const downloadUrl = String(doc.DownloadURL ?? doc.downloadUrl ?? "");
  const previewPath = fileId
    ? `/api/documents/preview?fileId=${encodeURIComponent(fileId)}`
    : undefined;
  const renderPath = fileId
    ? `/api/documents/render?fileId=${encodeURIComponent(fileId)}`
    : undefined;
  const fileUrl = downloadUrl || renderPath || previewPath || undefined;
  const contentType = inferContentTypeFromFileName(fileName);
  const previewable = Boolean(fileId) || isPreviewableFileName(fileName);

  return {
    fileName,
    fileId,
    documentType,
    fileDescription,
    downloadUrl: downloadUrl || undefined,
    fileUrl,
    renderPath,
    contentType,
    previewable,
    ref: fileId ? `Documents/${fileId}` : undefined,
    previewPath,
  };
}

/** Build a LIKE pattern for invoice number document search. */
export function invoiceNumberFilePattern(invoiceNumber: string): string {
  const trimmed = invoiceNumber.trim().replace(/^#+/, "");
  return trimmed.includes("%") ? trimmed : `%${trimmed}%`;
}
