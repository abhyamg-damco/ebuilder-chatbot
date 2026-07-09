/**
 * @file Allowed upload MIME types and category classification.
 */

/** Supported image MIME types. */
export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png"] as const;

/** Supported document MIME types. */
export const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const;

/** All allowed upload MIME types. */
export const ALLOWED_MIME_TYPES = [
  ...IMAGE_MIME_TYPES,
  ...DOCUMENT_MIME_TYPES,
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];
export type UploadCategory = "image" | "document";

/** MIME types the AI SDK can pass as native multimodal file parts (vision). */
export const MODEL_NATIVE_FILE_MIME_TYPES = IMAGE_MIME_TYPES;

/**
 * Returns whether a MIME type can be sent as a native model file part.
 */
export function isModelNativeFileMimeType(mimeType: string): boolean {
  return (MODEL_NATIVE_FILE_MIME_TYPES as readonly string[]).includes(mimeType);
}

/** File picker accept string for the multimodal input. */
export const FILE_ACCEPT =
  "image/jpeg,image/png,application/pdf,text/plain,text/csv,.docx,.xlsx,.pptx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation";

/**
 * Returns whether a MIME type is allowed for upload.
 */
export function isAllowedMimeType(mimeType: string): mimeType is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

/**
 * Classifies an allowed MIME type as image or document.
 */
export function getUploadCategory(mimeType: AllowedMimeType): UploadCategory {
  return (IMAGE_MIME_TYPES as readonly string[]).includes(mimeType)
    ? "image"
    : "document";
}

/**
 * Returns the max upload size in bytes for the given category.
 */
export function getMaxUploadBytes(category: UploadCategory): number {
  if (category === "image") {
    return Number(process.env.GCS_IMAGE_MAX_BYTES ?? 10 * 1024 * 1024);
  }
  return Number(process.env.GCS_DOCUMENT_MAX_BYTES ?? 25 * 1024 * 1024);
}
