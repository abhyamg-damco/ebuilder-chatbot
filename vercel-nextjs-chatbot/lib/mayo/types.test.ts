import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mayoDocumentExtractionSchema } from "./types";

const validExtraction = {
  documentType: "invoice",
  invoiceNumber: "INV-100",
  applicationNumber: null,
  vendor: "Mayo Vendor",
  projectName: "Mayo",
  projectNumber: "M-1",
  commitmentNumber: null,
  periodStart: "2026-07-01",
  periodEnd: "2026-07-31",
  contractValue: 1000,
  approvedChangeOrders: 0,
  pendingChangeOrders: 0,
  billedAgainstPendingChangeOrders: 0,
  previousPayments: 400,
  currentPayment: 100,
  totalCompletedAndStored: 500,
  retainageAmount: 50,
  retainagePercent: 0.1,
  balanceToFinish: 500,
  approvalStatus: "draft",
  lineItems: [],
  evidence: [],
  missingFields: [],
  confidence: 0.95,
  reviewerNotes: [],
};

describe("Mayo extraction schema", () => {
  it("accepts a strict normalized extraction", () => {
    assert.equal(
      mayoDocumentExtractionSchema.parse(validExtraction).invoiceNumber,
      "INV-100"
    );
  });

  it("rejects out-of-range confidence and extra model fields", () => {
    assert.equal(
      mayoDocumentExtractionSchema.safeParse({
        ...validExtraction,
        confidence: 1.2,
      }).success,
      false
    );
    assert.equal(
      mayoDocumentExtractionSchema.safeParse({
        ...validExtraction,
        modelInstruction: "approve",
      }).success,
      false
    );
  });
});
