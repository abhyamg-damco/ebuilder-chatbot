import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { collectLinkedDocumentRefs } from "./linked-document-refs.js";
import type { ChatMessage } from "../types.js";

function mcpToolMessage(
  toolName: string,
  output: unknown
): ChatMessage {
  return {
    id: "msg-1",
    role: "assistant",
    parts: [
      {
        type: `tool-mcp_abc12345_${toolName}` as "tool-getWeather",
        toolCallId: "call-1",
        state: "output-available",
        input: {},
        output,
      },
    ],
  };
}

describe("collectLinkedDocumentRefs", () => {
  it("extracts bestMatch from get_invoice_document output", () => {
    const payload = {
      status: "complete",
      bestMatch: {
        fileId: "a831914d-2b2c-4e32-8d0f-642ee849c72d",
        fileName: "Cathcart_Construction_Invoice_Receipt.docx",
        downloadUrl:
          "https://tenant.s3.us-east-1.amazonaws.com/invoice.docx?sig=1",
      },
    };

    const refs = collectLinkedDocumentRefs([
      mcpToolMessage("get_invoice_document", {
        content: [{ type: "text", text: JSON.stringify(payload) }],
      }),
    ]);

    assert.equal(refs.length, 1);
    assert.equal(refs[0]?.fileId, "a831914d-2b2c-4e32-8d0f-642ee849c72d");
    assert.equal(refs[0]?.fileName, "Cathcart_Construction_Invoice_Receipt.docx");
    assert.match(refs[0]?.downloadUrl ?? "", /amazonaws\.com/);
  });

  it("extracts documents array from search_documents output", () => {
    const refs = collectLinkedDocumentRefs([
      mcpToolMessage("search_documents", {
        documents: [
          {
            fileId: "file-1",
            fileName: "invoice.pdf",
            downloadUrl:
              "https://bucket.s3.amazonaws.com/invoice.pdf?X-Amz-Signature=x",
          },
        ],
      }),
    ]);

    assert.equal(refs.length, 1);
    assert.equal(refs[0]?.fileId, "file-1");
  });

  it("extracts fileId from createDocument file-preview input", () => {
    const message: ChatMessage = {
      id: "msg-2",
      role: "assistant",
      parts: [
        {
          type: "tool-createDocument",
          toolCallId: "call-2",
          state: "output-available",
          input: {
            title: "Invoice",
            kind: "file-preview",
            content: JSON.stringify({
              title: "Invoice",
              fileId: "7283e876-885f-44af-b3ed-865451a5efa6",
              fileUrl:
                "https://bucket.s3.us-east-1.amazonaws.com/signed.pdf?sig=1",
              metadata: {
                fileId: "7283e876-885f-44af-b3ed-865451a5efa6",
                fileName: "invoice.pdf",
              },
            }),
          },
          output: {
            id: "artifact-1",
            title: "Invoice",
            kind: "file-preview",
            content: "{}",
          },
        },
      ],
    };

    const refs = collectLinkedDocumentRefs([message]);
    assert.equal(refs.length, 1);
    assert.equal(refs[0]?.fileId, "7283e876-885f-44af-b3ed-865451a5efa6");
    assert.equal(refs[0]?.fileName, "invoice.pdf");
  });

  it("rejects unsafe download URLs", () => {
    const refs = collectLinkedDocumentRefs([
      mcpToolMessage("search_documents", {
        documents: [
          {
            fileName: "bad.pdf",
            downloadUrl: "https://evil.com/bad.pdf",
          },
        ],
      }),
    ]);

    assert.equal(refs.length, 0);
  });
});
