import type { DocumentAccessInfo } from "@/lib/documents/access";

const PROMPT_TEXT_PREVIEW_MAX = 4000;

/**
 * Builds the system-prompt section for e-Builder linked documents with extracted text.
 */
export function linkedDocumentsPrompt(
  linkedDocuments: DocumentAccessInfo[]
): string {
  if (linkedDocuments.length === 0) {
    return "";
  }

  const lines = linkedDocuments.map((doc) => {
    const preview = doc.extractedTextPreview
      ? `\n  Extracted text:\n${doc.extractedTextPreview.slice(0, PROMPT_TEXT_PREVIEW_MAX)}${doc.extractedTextPreview.length > PROMPT_TEXT_PREVIEW_MAX ? "\n…(truncated — call getLinkedDocuments for full text)" : ""}`
      : doc.unsupportedReason
        ? `\n  (${doc.unsupportedReason})`
        : "\n  (No text extracted — call getLinkedDocuments with fileId or downloadUrl)";

    const pages =
      doc.pageCount !== undefined ? `, ${doc.pageCount} pages` : "";

    const idLine = doc.fileId ? `\n  File ID: ${doc.fileId}` : "";

    return `- **${doc.fileName}** (${doc.mimeType}, ${doc.category}${pages})${idLine}${preview}`;
  });

  return `## Linked e-Builder documents (ACTIVE)

The following e-Builder documents were resolved in this chat. **Use the extracted text below** to answer questions about document contents (line items, totals, dates, vendor info). Do not tell the user you cannot access the file when text is present.

${lines.join("\n\n")}

Rules:
1. For document Q&A, use **Extracted text** above or call \`getLinkedDocuments\` for the full preview or to refresh after MCP returns a new document.
2. After \`get_invoice_document\` or \`search_documents\`, call \`getLinkedDocuments\` with \`fileId\` when the user asks what the document contains in the same turn.
3. For visual preview only, use \`createDocument\` with kind \`file-preview\` — do not fabricate document content.`;
}
