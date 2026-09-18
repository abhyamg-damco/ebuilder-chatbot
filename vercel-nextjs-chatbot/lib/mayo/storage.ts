import "server-only";

import { createHash } from "node:crypto";
import { getGcsBucketName } from "@/lib/storage/config";
import { getGcsClient } from "@/lib/storage/gcs-client";
import { sanitizeFilename } from "@/lib/storage/upload";

export const MAYO_MAX_DOCUMENT_BYTES = 512 * 1024 * 1024;

const MAYO_ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/markdown",
  "application/json",
]);

export function isAllowedMayoMimeType(mimeType: string): boolean {
  return MAYO_ALLOWED_MIME_TYPES.has(mimeType);
}

export function buildMayoObjectPath(input: {
  caseId: string;
  documentId: string;
  filename: string;
}): string {
  return `mayo/cases/${input.caseId}/documents/${input.documentId}/${sanitizeFilename(input.filename)}`;
}

export async function createMayoResumableUpload(input: {
  objectPath: string;
  mimeType: string;
  origin?: string;
}): Promise<{ bucket: string; uploadUrl: string }> {
  const bucket = getGcsBucketName();
  const file = getGcsClient().bucket(bucket).file(input.objectPath);
  const [uploadUrl] = await file.createResumableUpload({
    origin: input.origin,
    private: true,
    metadata: {
      contentType: input.mimeType,
      cacheControl: "private, max-age=0",
    },
  });

  return { bucket, uploadUrl };
}

export async function inspectAndHashMayoObject(input: {
  bucket: string;
  objectPath: string;
}): Promise<{
  sizeBytes: number;
  contentType: string;
  checksumSha256: string;
}> {
  const file = getGcsClient().bucket(input.bucket).file(input.objectPath);
  const [exists] = await file.exists();
  if (!exists) {
    throw new Error("Uploaded GCS object was not found");
  }

  const [metadata] = await file.getMetadata();
  const hash = createHash("sha256");
  let streamedBytes = 0;
  const stream = file.createReadStream();

  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    hash.update(buffer);
    streamedBytes += buffer.byteLength;
  }

  const metadataBytes = Number(metadata.size ?? streamedBytes);
  if (metadataBytes !== streamedBytes) {
    throw new Error("Uploaded object size changed during verification");
  }

  return {
    sizeBytes: metadataBytes,
    contentType: metadata.contentType ?? "application/octet-stream",
    checksumSha256: hash.digest("hex"),
  };
}

export async function deleteMayoObject(input: {
  bucket: string;
  objectPath: string;
}): Promise<void> {
  await getGcsClient()
    .bucket(input.bucket)
    .file(input.objectPath)
    .delete({ ignoreNotFound: true });
}
