import { tool } from "ai";
import { z } from "zod";

import type { UploadAccessInfo } from "@/lib/chat/uploads";

/**
 * Factory for the getChatUploads tool — returns fresh signed URLs and text previews.
 */
export function createGetChatUploadsTool(uploads: UploadAccessInfo[]) {
  return tool({
    description:
      "Returns all files uploaded in this chat with fresh signed access URLs and text previews. Call when you need to read or reference user-uploaded documents or images.",
    inputSchema: z.object({}),
    execute: async () => ({
      count: uploads.length,
      uploads: uploads.map((upload) => ({
        id: upload.id,
        filename: upload.originalFilename,
        mimeType: upload.mimeType,
        category: upload.category,
        url: upload.url,
        expiresAt: upload.expiresAt,
        isPublic: upload.isPublic,
        extractedTextPreview: upload.extractedTextPreview,
        pageCount: upload.pageCount,
      })),
    }),
  });
}
