import "server-only";

import type { ChatUpload } from "@/lib/db/schema";
import { updateChatUploadStatus } from "@/lib/db/queries";
import { extractTextPreview } from "@/lib/storage/extract-text";
import { logStorageError } from "@/lib/storage/logger";
import { isModelNativeFileMimeType, type AllowedMimeType } from "@/lib/storage/mime";
import {
  downloadFromGcs,
  getReadableUrl,
  getSignedReadUrl,
} from "@/lib/storage/upload";
import type { ChatMessage } from "@/lib/types";

export type UploadAccessInfo = {
  id: string;
  originalFilename: string;
  mimeType: string;
  category: "image" | "document";
  url: string;
  expiresAt: string;
  isPublic: boolean;
  extractedTextPreview?: string;
  pageCount?: number;
};

/**
 * Ensures document uploads have extracted text (lazy backfill for older uploads).
 */
async function ensureDocumentTextPreview(
  upload: ChatUpload
): Promise<string | undefined> {
  if (upload.metadata?.extractedTextPreview) {
    return upload.metadata.extractedTextPreview;
  }

  if (upload.category !== "document" || !upload.bucket) {
    return undefined;
  }

  try {
    const buffer = await downloadFromGcs({
      bucket: upload.bucket,
      objectPath: upload.objectPath,
    });

    const extracted = await extractTextPreview({
      buffer,
      mimeType: upload.mimeType as AllowedMimeType,
      category: "document",
    });

    if (extracted.extractedTextPreview) {
      await updateChatUploadStatus({
        id: upload.id,
        status: "ready",
        metadata: { ...upload.metadata, ...extracted },
      });
    }

    return extracted.extractedTextPreview;
  } catch (error) {
    logStorageError("ensureDocumentTextPreview", error, { uploadId: upload.id });
    return undefined;
  }
}

/**
 * Resolves a URL the model can use for image file parts only.
 */
async function resolveImageModelUrl(
  upload: ChatUpload
): Promise<{ url: string; expiresAt: string }> {
  const expiresAt = new Date(Date.now() + 3_600_000).toISOString();

  try {
    if (upload.isPublic) {
      return getReadableUrl({
        objectPath: upload.objectPath,
        bucket: upload.bucket,
        isPublic: true,
      });
    }

    return getSignedReadUrl({
      objectPath: upload.objectPath,
      bucket: upload.bucket,
    });
  } catch (signError) {
    logStorageError("resolveImageModelUrl:signed", signError, {
      uploadId: upload.id,
    });

    const buffer = await downloadFromGcs({
      bucket: upload.bucket,
      objectPath: upload.objectPath,
    });
    const base64 = buffer.toString("base64");
    return {
      url: `data:${upload.mimeType};base64,${base64}`,
      expiresAt,
    };
  }
}

/**
 * Builds access metadata for all ready chat uploads.
 */
export async function buildUploadAccessList(
  uploads: ChatUpload[]
): Promise<UploadAccessInfo[]> {
  const results: UploadAccessInfo[] = [];

  for (const upload of uploads) {
    if (upload.status !== "ready" || !upload.bucket) {
      continue;
    }

    try {
      if (upload.category === "document") {
        const extractedTextPreview = await ensureDocumentTextPreview(upload);

        results.push({
          id: upload.id,
          originalFilename: upload.originalFilename,
          mimeType: upload.mimeType,
          category: "document",
          url: "",
          expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
          isPublic: upload.isPublic,
          extractedTextPreview,
          pageCount: upload.metadata?.pageCount,
        });
        continue;
      }

      const access = await resolveImageModelUrl(upload);

      results.push({
        id: upload.id,
        originalFilename: upload.originalFilename,
        mimeType: upload.mimeType,
        category: "image",
        url: access.url,
        expiresAt: access.expiresAt,
        isPublic: upload.isPublic,
      });
    } catch (error) {
      logStorageError("buildUploadAccessList", error, { uploadId: upload.id });
    }
  }

  return results;
}

/**
 * Removes document file parts before convertToModelMessages — only images are native file parts.
 * Document content is provided via the chat uploads system prompt and getChatUploads tool.
 */
export function stripNonNativeFileParts(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((message) => ({
    ...message,
    parts: message.parts.filter((part) => {
      if (part.type !== "file") {
        return true;
      }

      const mediaType =
        "mediaType" in part && typeof part.mediaType === "string"
          ? part.mediaType
          : "";

      return isModelNativeFileMimeType(mediaType);
    }),
  }));
}

/**
 * Replaces image file-part URLs in UI messages with fresh URLs from upload records.
 */
export async function refreshFilePartUrls({
  messages,
  uploads,
}: {
  messages: ChatMessage[];
  uploads: UploadAccessInfo[];
}): Promise<ChatMessage[]> {
  const byId = new Map(uploads.map((u) => [u.id, u]));

  return messages.map((message) => ({
    ...message,
    parts: message.parts.map((part) => {
      if (part.type !== "file") {
        return part;
      }

      const uploadId =
        "uploadId" in part && typeof part.uploadId === "string"
          ? part.uploadId
          : undefined;

      if (!uploadId) {
        return part;
      }

      const access = byId.get(uploadId);
      if (!access || !access.url) {
        return part;
      }

      return {
        ...part,
        url: access.url,
        mediaType: access.mimeType,
        filename: access.originalFilename,
      };
    }),
  }));
}

/**
 * Collects upload IDs referenced in file message parts.
 */
export function collectUploadIdsFromMessages(messages: ChatMessage[]): string[] {
  const ids = new Set<string>();

  for (const message of messages) {
    for (const part of message.parts) {
      if (
        part.type === "file" &&
        "uploadId" in part &&
        typeof part.uploadId === "string"
      ) {
        ids.add(part.uploadId);
      }
    }
  }

  return [...ids];
}
