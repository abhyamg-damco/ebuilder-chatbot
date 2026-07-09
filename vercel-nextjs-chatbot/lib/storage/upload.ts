/**
 * @file GCS upload, signed URL generation, and text extraction helpers.
 */
import "server-only";

import { createHash } from "node:crypto";
import { getGcsBucketName, getSignedUrlTtlSeconds } from "./config";
import { extractTextPreview } from "./extract-text";
import { getGcsClient } from "./gcs-client";
import { logStorageError } from "./logger";
import type { AllowedMimeType } from "./mime";

export type { ExtractedDocumentText as ChatUploadMetadata } from "./extract-text";
export { extractTextPreview };

export type GcsUploadResult = {
  bucket: string;
  objectPath: string;
  checksumSha256: string;
  metadata: import("./extract-text").ExtractedDocumentText;
};

export type SignedUrlResult = {
  url: string;
  expiresAt: string;
};

/**
 * Sanitizes a filename for safe use in GCS object keys.
 */
export function sanitizeFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? "file";
  const sanitized = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  return sanitized.length > 0 ? sanitized.slice(0, 200) : "file";
}

/**
 * Builds the GCS object key for a chat upload.
 */
export function buildObjectPath({
  chatId,
  uploadId,
  filename,
}: {
  chatId: string;
  uploadId: string;
  filename: string;
}): string {
  return `chats/${chatId}/uploads/${uploadId}/${sanitizeFilename(filename)}`;
}

/**
 * Uploads a file buffer to GCS.
 *
 * @param isPublic - When true, object is world-readable. Default false (private).
 */
export async function uploadToGcs({
  buffer,
  objectPath,
  mimeType,
  isPublic = false,
}: {
  buffer: Buffer;
  objectPath: string;
  mimeType: string;
  isPublic?: boolean;
}): Promise<GcsUploadResult> {
  const bucketName = getGcsBucketName();
  const bucket = getGcsClient().bucket(bucketName);
  const file = bucket.file(objectPath);
  const checksumSha256 = createHash("sha256").update(buffer).digest("hex");

  await file.save(buffer, {
    contentType: mimeType,
    resumable: false,
    metadata: {
      cacheControl: "private, max-age=0",
    },
  });

  return {
    bucket: bucketName,
    objectPath,
    checksumSha256,
    metadata: {},
  };
}

/**
 * Generates a v4 signed read URL for a GCS object.
 * Requires a service account key or IAM signBlob permissions.
 */
export async function getSignedReadUrl({
  objectPath,
  bucket,
}: {
  objectPath: string;
  bucket?: string;
}): Promise<SignedUrlResult> {
  const bucketName = bucket ?? getGcsBucketName();
  const ttlSeconds = getSignedUrlTtlSeconds();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  try {
    const [url] = await getGcsClient()
      .bucket(bucketName)
      .file(objectPath)
      .getSignedUrl({
        version: "v4",
        action: "read",
        expires: expiresAt,
      });

    return {
      url,
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error) {
    logStorageError("getSignedReadUrl", error, { bucket: bucketName, objectPath });
    throw error;
  }
}

/**
 * Downloads object bytes from GCS using server credentials (no signed URL).
 */
export async function downloadFromGcs({
  objectPath,
  bucket,
}: {
  objectPath: string;
  bucket: string;
}): Promise<Buffer> {
  try {
    const [buffer] = await getGcsClient()
      .bucket(bucket)
      .file(objectPath)
      .download();
    return buffer;
  } catch (error) {
    logStorageError("downloadFromGcs", error, { bucket, objectPath });
    throw error;
  }
}

/**
 * Returns a public URL when the object is marked public; otherwise signed URL.
 */
export async function getReadableUrl({
  objectPath,
  bucket,
  isPublic,
}: {
  objectPath: string;
  bucket: string;
  isPublic: boolean;
}): Promise<SignedUrlResult> {
  if (isPublic) {
    const url = `https://storage.googleapis.com/${bucket}/${objectPath}`;
    return {
      url,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }
  return getSignedReadUrl({ objectPath, bucket });
}

/**
 * Soft-deletes a GCS object (best-effort).
 */
export async function deleteFromGcs({
  objectPath,
  bucket,
}: {
  objectPath: string;
  bucket?: string;
}): Promise<void> {
  const bucketName = bucket ?? getGcsBucketName();
  await getGcsClient().bucket(bucketName).file(objectPath).delete({ ignoreNotFound: true });
}
