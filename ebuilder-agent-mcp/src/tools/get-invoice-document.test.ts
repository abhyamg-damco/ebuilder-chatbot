import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EBuilderClient } from "../api/client.js";
import { getInvoiceDocument } from "./get-invoice-document.js";

function createMockClient(
  handlers: Record<string, () => Promise<unknown>>
): EBuilderClient {
  return {
    post: async (path: string) => {
      for (const [key, handler] of Object.entries(handlers)) {
        if (path.includes(key)) {
          return handler();
        }
      }
      throw new Error(`Unexpected post path: ${path}`);
    },
    get: async () => {
      throw new Error("get not expected");
    },
  } as unknown as EBuilderClient;
}

describe("getInvoiceDocument", () => {
  it("returns bestMatch with fileUrl when documents are found", async () => {
    const client = createMockClient({
      Projects: async () => ({
        records: [
          {
            Project: {
              ProjectName: "Tower Project",
              PortalId: "portal-1",
            },
          },
        ],
      }),
      CommitmentInvoices: async () => ({
        records: [
          {
            CommitmentInvoice: {
              CommitmentInvoiceId: "inv-1",
              InvoiceNumber: "006",
              InvoiceAmount: "1000.0000",
              Description: "Draw 6",
            },
            Project: { ProjectName: "Tower Project" },
          },
        ],
      }),
      Documents: async () => ({
        records: [
          {
            Document: {
              FileName: "Invoice-006.pdf",
              FileId: "file-1",
              DownloadURL: "https://example.com/invoice-006.pdf",
            },
          },
        ],
      }),
    });

    const result = await getInvoiceDocument(client, {
      invoiceNumber: "006",
      projectSearchTerm: "Tower",
    });

    assert.equal(result.status, "complete");
    assert.equal(result.invoice?.invoiceNumber, "006");
    assert.equal(result.bestMatch?.fileUrl, "https://example.com/invoice-006.pdf");
    assert.equal(result.documents.length, 1);
  });

  it("returns incomplete when no invoice number or search pattern", async () => {
    const client = createMockClient({});

    const result = await getInvoiceDocument(client, {});

    assert.equal(result.status, "incomplete");
    assert.equal(result.documents.length, 0);
  });
});
