import "server-only";

import type { UploadAccessInfo } from "@/lib/chat/uploads";

/**
 * Builds the system-prompt section listing chat uploads with signed URLs.
 */
export function chatUploadsPrompt(uploads: UploadAccessInfo[]): string {
  if (uploads.length === 0) {
    return "";
  }

  const lines = uploads.map((upload) => {
    const preview = upload.extractedTextPreview
      ? `\n  Extracted text:\n${upload.extractedTextPreview.slice(0, 4000)}${upload.extractedTextPreview.length > 4000 ? "\n…(truncated — call getChatUploads for full text)" : ""}`
      : "\n  (No text extracted — call getChatUploads or ask the user to re-upload as PDF/TXT)";
    const pages =
      upload.pageCount !== undefined ? `, ${upload.pageCount} pages` : "";

    const urlLine =
      upload.category === "image" && upload.url
        ? `\n  Image URL: ${upload.url}`
        : "";

    const browserLine = upload.useInBrowser
      ? "\n  **Use in browser:** yes — sync via browserSyncUploads, attach via browserAttachFile"
      : "";

    return `- **${upload.originalFilename}** (${upload.mimeType}, ${upload.category}${pages})
  Upload ID: ${upload.id}${urlLine}${browserLine}${preview}`;
  });

  return `## Chat uploads (ACTIVE)

The user has uploaded ${uploads.length} file(s). **Documents (PDF, DOCX, TXT, etc.) are NOT native file attachments** — their content is provided as extracted text below and via \`getChatUploads\`. Answer document questions using that text.

${lines.join("\n\n")}

Rules:
1. For document Q&A, use the **Extracted text** above or call \`getChatUploads\` for the full preview.
2. Only **images** (JPEG/PNG) are attached as vision file parts.
3. For **browser form uploads**, files marked **Use in browser** must be synced into the cloud session — never pass GCS/signed URLs to file inputs.
4. Workflow: \`browserNavigate\` → \`browserSyncUploads\` (if needed) → \`browserAttachFile(uploadId, selector)\` → \`browserAct\` to submit. For complex flows, use \`browserAgent\` after syncing files.`;
}
