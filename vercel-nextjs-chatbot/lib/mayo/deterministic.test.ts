import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createMayoFindingFingerprint,
  evaluateMayoDeterministicRules,
} from "./deterministic";
import type { MayoDocumentExtractionData, MayoNormalizedRule } from "./types";

const rules: MayoNormalizedRule[] = [
  {
    id: "rule-math",
    familyId: "payment-review",
    code: "MATH",
    name: "Math",
    description: "Math check",
    kind: "deterministic",
    severity: "high",
    config: { toleranceUsd: 10 },
    version: 1,
  },
  {
    id: "rule-large-period",
    familyId: "payment-review",
    code: "LARGE_PERIOD",
    name: "Large period",
    description: "Large period check",
    kind: "deterministic",
    severity: "medium",
    config: { tolerancePct: 0.2 },
    version: 1,
  },
  {
    id: "rule-over",
    familyId: "payment-review",
    code: "OVER_BILLING",
    name: "Over billing",
    description: "Over billing check",
    kind: "deterministic",
    severity: "critical",
    config: { toleranceUsd: 1 },
    version: 1,
  },
];

const extraction: MayoDocumentExtractionData = {
  documentType: "pay_application",
  invoiceNumber: "INV-10",
  applicationNumber: "10",
  vendor: "Vendor",
  projectName: "Mayo",
  projectNumber: "M-1",
  commitmentNumber: null,
  periodStart: null,
  periodEnd: null,
  contractValue: 1000,
  approvedChangeOrders: 0,
  pendingChangeOrders: 0,
  billedAgainstPendingChangeOrders: 0,
  previousPayments: 400,
  currentPayment: 200,
  totalCompletedAndStored: 600,
  retainageAmount: 60,
  retainagePercent: 0.1,
  balanceToFinish: 400,
  approvalStatus: "draft",
  lineItems: [
    {
      lineNumber: "1",
      description: "Work",
      scheduledValue: 100,
      previousApplications: 50,
      currentApplication: 175,
      storedMaterials: 0,
      totalCompleted: 225,
      percentComplete: 2.25,
      balanceToFinish: -125,
      retainage: 22.5,
      sourceExcerpt: "Line 1 Work 225",
      pageNumber: 2,
      confidence: 0.98,
    },
  ],
  evidence: [],
  missingFields: [],
  confidence: 0.98,
  reviewerNotes: [],
};

describe("Mayo deterministic review", () => {
  it("finds math and over-billing variances", () => {
    const findings = evaluateMayoDeterministicRules({
      extractions: [{ filename: "pay-app.pdf", data: extraction }],
      rules,
    });

    assert.equal(findings.length, 2);
    assert.deepEqual(findings.map((finding) => finding.ruleCode).sort(), [
      "MATH",
      "OVER_BILLING",
    ]);
  });

  it("creates stable evidence fingerprints", () => {
    const input = {
      caseId: "case-1",
      ruleCode: "MATH",
      title: "Mismatch",
      evidence: [
        {
          documentId: "doc-1",
          openaiFileId: "file-1",
          filename: "Pay App.pdf",
          excerpt: " Total   mismatch ",
          pageNumber: 1,
          confidence: 0.9,
        },
      ],
    };

    assert.equal(
      createMayoFindingFingerprint(input),
      createMayoFindingFingerprint({
        ...input,
        evidence: [{ ...input.evidence[0], excerpt: "total mismatch" }],
      })
    );
  });

  it("orders payment history by period rather than extraction order", () => {
    const withPayment = (
      applicationNumber: string,
      periodEnd: string,
      currentPayment: number
    ) => ({
      ...extraction,
      applicationNumber,
      periodEnd,
      currentPayment,
      lineItems: [],
    });
    const findings = evaluateMayoDeterministicRules({
      extractions: [
        {
          filename: "pay-app-7.pdf",
          data: withPayment("7", "2026-07-31", 450),
        },
        {
          filename: "pay-app-5.pdf",
          data: withPayment("5", "2026-05-31", 100),
        },
        {
          filename: "pay-app-6.pdf",
          data: withPayment("6", "2026-06-30", 120),
        },
      ],
      rules,
    });

    assert.ok(findings.some((finding) => finding.ruleCode === "LARGE_PERIOD"));
  });

  it("reads the retainage rate whether it is a fraction or percentage points", () => {
    const retainageRules: MayoNormalizedRule[] = [
      {
        id: "rule-retainage",
        familyId: "payment-review",
        code: "RETAINAGE",
        name: "Retainage",
        description: "Retainage check",
        kind: "deterministic",
        severity: "high",
        config: { tolerancePct: 0.0025 },
        version: 1,
      },
    ];
    // 60 withheld against 600 completed is exactly the stated 10% rate, so a
    // correct document must not raise a finding under either convention.
    const asFraction = { ...extraction, retainagePercent: 0.1, lineItems: [] };
    const asPercentagePoints = {
      ...extraction,
      retainagePercent: 10,
      lineItems: [],
    };

    for (const data of [asFraction, asPercentagePoints]) {
      const findings = evaluateMayoDeterministicRules({
        extractions: [{ filename: "pay-app.pdf", data }],
        rules: retainageRules,
      });
      assert.equal(
        findings.filter((finding) => finding.ruleCode === "RETAINAGE").length,
        0
      );
    }

    // And a genuine under-withholding is still caught.
    const underWithheld = {
      ...extraction,
      retainagePercent: 10,
      retainageAmount: 20,
      lineItems: [],
    };
    const findings = evaluateMayoDeterministicRules({
      extractions: [{ filename: "pay-app.pdf", data: underWithheld }],
      rules: retainageRules,
    });
    const retainage = findings.find(
      (finding) => finding.ruleCode === "RETAINAGE"
    );
    assert.ok(retainage);
    assert.equal(retainage.amountImpact, 40);
  });
});
