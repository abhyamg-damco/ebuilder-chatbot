import {
  type FilePreviewContent,
  filePreviewContentSchema,
  parseInsightJson,
} from "@/lib/insights/types";

/** Example UUID from prompt/tests — agents must not copy this into artifacts. */
export const KNOWN_TEST_FILE_ID = "a831914d-2b2c-4e32-8d0f-642ee849c72d";

function isUsableDownloadUrl(url: unknown): url is string {
  return (
    typeof url === "string" &&
    url.startsWith("https://") &&
    !url.includes("...")
  );
}

function isKnownTestFileId(fileId: unknown): boolean {
  return fileId === KNOWN_TEST_FILE_ID;
}

/**
 * Sanitize agent-supplied file-preview JSON: strip invalid placeholder IDs/URLs
 * so the UI falls back to download-only instead of a broken iframe.
 */
export function sanitizeFilePreviewPayload(
  rawContent: string
): string {
  try {
    const parsed = filePreviewContentSchema.safeParse(
      parseInsightJson(rawContent)
    );
    if (!parsed.success) {
      return rawContent;
    }

    const preview = { ...parsed.data };
    let changed = false;

    if (isKnownTestFileId(preview.fileId)) {
      preview.fileId = undefined;
      changed = true;
    }

    if (
      preview.metadata?.fileId &&
      isKnownTestFileId(preview.metadata.fileId)
    ) {
      preview.metadata = { ...preview.metadata, fileId: "" };
      changed = true;
    }

    if (!isUsableDownloadUrl(preview.fileUrl)) {
      preview.fileUrl = "";
      changed = true;
    }

    const hasFileId =
      Boolean(preview.fileId) ||
      Boolean(preview.metadata?.fileId && preview.metadata.fileId.length > 0);
    const hasDownload = isUsableDownloadUrl(preview.fileUrl);

    if (!hasFileId && !hasDownload) {
      preview.previewable = false;
      changed = true;
    }

    if (!changed) {
      return rawContent;
    }

    return JSON.stringify(preview satisfies FilePreviewContent);
  } catch {
    return rawContent;
  }
}
