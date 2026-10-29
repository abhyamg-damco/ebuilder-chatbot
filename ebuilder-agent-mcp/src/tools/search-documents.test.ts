import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EBuilderClient } from "../api/client.js";
import {
  inferContentTypeFromFileName,
  invoiceNumberFilePattern,
  isPreviewableFileName,
  normalizeDocument,
} from "./document-normalize.js";
import { searchDocuments } from "./search-documents.js";

type QueryFilter = { Field: string; Operation: string; Value: string };
type QueryBody = { Filters?: QueryFilter[] };
type Captured = { body: QueryBody; params?: Record<string, unknown> };

/** Mock client that records the query it was asked to run. */
function recordingClient(records: unknown[] = []): {
  client: EBuilderClient;
  calls: Captured[];
} {
  const calls: Captured[] = [];
  const client = {
    post: async (
      _path: string,
      body?: unknown,
      params?: Record<string, unknown>
    ) => {
      calls.push({ body: (body ?? {}) as QueryBody, params });
      return { records };
    },
  } as unknown as EBuilderClient;

  return { client, calls };
}

const oneDocument = [
  {
    Document: {
      FileName: "Test2.pdf",
      FileId: "2d2cdf28-42ff-4f0e-82c0-00b05b89eb85",
      DownloadURL: "https://tenant.s3.amazonaws.com/t.pdf?X-Amz-Signature=a",
    },
  },
];

describe("inferContentTypeFromFileName", () => {
  it("maps common extensions to MIME types", () => {
    assert.equal(
      inferContentTypeFromFileName("invoice.pdf"),
      "application/pdf"
    );
    assert.equal(inferContentTypeFromFileName("scan.png"), "image/png");
    assert.equal(
      inferContentTypeFromFileName("receipt.docx"),
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
  });

  it("returns undefined for unknown extensions", () => {
    assert.equal(inferContentTypeFromFileName("archive"), undefined);
  });
});

describe("isPreviewableFileName", () => {
  it("allows inline preview for PDF, images, and Word", () => {
    assert.equal(isPreviewableFileName("invoice.pdf"), true);
    assert.equal(isPreviewableFileName("photo.jpg"), true);
    assert.equal(isPreviewableFileName("invoice.docx"), true);
    assert.equal(isPreviewableFileName("invoice.doc"), true);
  });
});

describe("normalizeDocument", () => {
  it("prefers DownloadURL as fileUrl", () => {
    const result = normalizeDocument({
      Document: {
        FileName: "CINVI-00001 - Invoice for Company ABC.pdf",
        FileId: "7283e876-885f-44af-b3ed-865451a5efa6",
        DownloadURL: "https://example.com/signed.pdf",
      },
    });

    assert.equal(result.downloadUrl, "https://example.com/signed.pdf");
    assert.equal(result.fileUrl, "https://example.com/signed.pdf");
    assert.equal(result.contentType, "application/pdf");
    assert.equal(result.previewable, true);
    assert.equal(result.ref, "Documents/7283e876-885f-44af-b3ed-865451a5efa6");
  });

  it("marks docx as previewable when fileId is present", () => {
    const result = normalizeDocument({
      Document: {
        FileName: "Cathcart_Construction_Invoice_Receipt.docx",
        FileId: "a831914d-2b2c-4e32-8d0f-642ee849c72d",
        DownloadURL: "https://example.com/invoice.docx",
      },
    });

    assert.equal(result.previewable, true);
    assert.equal(
      result.renderPath,
      "/api/documents/render?fileId=a831914d-2b2c-4e32-8d0f-642ee849c72d"
    );
  });

  it("falls back to renderPath when DownloadURL is missing", () => {
    const result = normalizeDocument({
      Document: {
        FileName: "backup.pdf",
        FileId: "abc-123",
      },
    });

    assert.equal(result.downloadUrl, undefined);
    assert.equal(result.fileUrl, "/api/documents/render?fileId=abc-123");
  });
});

describe("invoiceNumberFilePattern", () => {
  it("wraps invoice numbers in LIKE wildcards", () => {
    assert.equal(invoiceNumberFilePattern("006"), "%006%");
    assert.equal(invoiceNumberFilePattern("#6"), "%6%");
  });
});

describe("searchDocuments by fileId", () => {
  it("filters on an exact FileId with = rather than EQ", async () => {
    // e-Builder answers EQ with 400 Invalid filter operation (EQ) encountered.
    const { client, calls } = recordingClient(oneDocument);

    await searchDocuments(client, {
      fileId: "2d2cdf28-42ff-4f0e-82c0-00b05b89eb85",
    });

    assert.deepEqual(calls[0].body.Filters, [
      {
        Field: "Document/FileId",
        Operation: "=",
        Value: "2d2cdf28-42ff-4f0e-82c0-00b05b89eb85",
      },
    ]);
  });

  it("ignores every other filter, since an id identifies one document", async () => {
    const { client, calls } = recordingClient(oneDocument);

    await searchDocuments(client, {
      fileId: "2d2cdf28-42ff-4f0e-82c0-00b05b89eb85",
      projectSearchTerm: "Second Floor Cleaning",
      fileNamePattern: "%invoice%",
      documentType: "Invoice",
    });

    // One call only: the project lookup never ran.
    assert.equal(calls.length, 1);
    assert.equal(calls[0].body.Filters?.length, 1);
    assert.equal(calls[0].body.Filters?.[0].Field, "Document/FileId");
  });

  it("asks for a single record", async () => {
    const { client, calls } = recordingClient(oneDocument);

    await searchDocuments(client, {
      fileId: "2d2cdf28-42ff-4f0e-82c0-00b05b89eb85",
      limit: 50,
    });

    // buildQueryParams stringifies everything for the query string.
    assert.equal(calls[0].params?.pageSize, "1");
  });

  it("reports an unknown id as partial rather than throwing", async () => {
    const { client } = recordingClient([]);

    const result = await searchDocuments(client, {
      fileId: "00000000-0000-0000-0000-000000000000",
    });

    assert.equal(result.status, "partial");
    assert.equal(result.documents.length, 0);
  });

  it("leaves name search on LIKE when no fileId is given", async () => {
    const { client, calls } = recordingClient(oneDocument);

    await searchDocuments(client, { fileNamePattern: "%Test2%" });

    assert.deepEqual(calls[0].body.Filters, [
      { Field: "Document/FileName", Operation: "LIKE", Value: "%Test2%" },
    ]);
  });
});
