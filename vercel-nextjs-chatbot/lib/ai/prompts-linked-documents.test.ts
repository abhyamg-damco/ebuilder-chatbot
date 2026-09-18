import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { linkedDocumentsPrompt } from "./prompts-linked-documents.js";
import type { DocumentAccessInfo } from "../documents/access.js";

describe("linkedDocumentsPrompt", () => {
  it("includes extracted text for linked documents", () => {
    const docs: DocumentAccessInfo[] = [
      {
        id: "file-1",
        source: "ebuilder",
        fileName: "invoice.docx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        category: "document",
        fileId: "file-1",
        extractedTextPreview: "Vendor: ACME Corp\nTotal: $1,234.56",
        supported: true,
      },
    ];

    const prompt = linkedDocumentsPrompt(docs);
    assert.match(prompt, /Linked e-Builder documents/);
    assert.match(prompt, /ACME Corp/);
    assert.match(prompt, /getLinkedDocuments/);
  });

  it("returns empty string when no documents", () => {
    assert.equal(linkedDocumentsPrompt([]), "");
  });
});
