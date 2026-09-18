import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  inferContentTypeFromFileName,
  invoiceNumberFilePattern,
  isPreviewableFileName,
  normalizeDocument,
} from "./document-normalize.js";

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
