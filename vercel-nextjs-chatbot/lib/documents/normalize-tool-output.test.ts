import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeToolOutput } from "./normalize-tool-output.js";

describe("normalizeToolOutput", () => {
  it("parses MCP content envelope with JSON text", () => {
    const payload = {
      status: "complete",
      bestMatch: {
        fileId: "a831914d-2b2c-4e32-8d0f-642ee849c72d",
        fileName: "Cathcart_Construction_Invoice_Receipt.docx",
        downloadUrl:
          "https://tenant.s3.us-east-1.amazonaws.com/invoice.docx?sig=1",
      },
    };

    const normalized = normalizeToolOutput({
      content: [{ type: "text", text: JSON.stringify(payload) }],
    });

    assert.equal(normalized?.status, "complete");
    assert.equal(
      (normalized?.bestMatch as { fileId?: string })?.fileId,
      "a831914d-2b2c-4e32-8d0f-642ee849c72d"
    );
  });

  it("parses stringified JSON tool output", () => {
    const normalized = normalizeToolOutput(
      JSON.stringify({ documents: [{ fileId: "abc-123" }] })
    );
    assert.ok(Array.isArray(normalized?.documents));
  });
});
