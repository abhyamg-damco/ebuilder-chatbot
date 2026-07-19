import assert from "node:assert/strict";
import test from "node:test";
import { evaluateInvoiceChecks } from "./evaluate.js";
import {
  DEFAULT_ENABLED_CHECKS,
  DEFAULT_TOLERANCES,
} from "./defaults.js";
import type { EvidencePack } from "./types.js";

function buildSamplePack(overrides?: Partial<EvidencePack>): EvidencePack {
  return {
    invoice: {
      id: "inv-1",
      number: "006",
      status: "Submitted",
      invoiceAmount: 1_200_000,
      amountRetained: 120_000,
      retainageReleased: 0,
      amountLessRetainage: 1_080_000,
      commitmentId: "cmt-1",
      lines: [
        {
          lineNo: "14",
          description: "Curtain wall",
          budgetLineItemId: "bli-14",
          thisPeriod: 1_200_000,
          amount: 1_200_000,
          retainagePercent: 0.08,
          retainageAmount: 96_000,
          ref: "CommitmentInvoiceItems/line-14",
        },
      ],
      ref: "CommitmentInvoices/inv-1",
    },
    commitment: {
      id: "cmt-1",
      number: "001",
      originalContractValue: 10_000_000,
      currentContractValue: 10_500_000,
      approvedChanges: 500_000,
      pendingChanges: 300_000,
      retainagePercent: 10,
      currentRetainageHeld: 500_000,
      costControlTolerancePercent: 10,
      actualsApproved: 8_000_000,
      remainingToBePaid: 2_500_000,
      sov: [
        {
          lineNo: "14",
          description: "Curtain wall",
          budgetLineItemId: "bli-14",
          scheduledValue: 900_000,
          currentValue: 900_000,
          actualsApproved: 800_000,
          remainingToBePaid: 100_000,
          approvedChanges: 0,
          ref: "CommitmentItems/sov-14",
        },
      ],
      ref: "Commitments/cmt-1",
    },
    priorInvoices: [
      {
        id: "inv-4",
        number: "004",
        status: "Paid",
        invoiceAmount: 450_000,
        amountRetained: 45_000,
        lines: [
          {
            lineNo: "9",
            description: "Stored materials",
            budgetLineItemId: "bli-9",
            thisPeriod: 450_000,
            amount: 450_000,
            retainagePercent: 0.1,
            retainageAmount: 45_000,
            ref: "CommitmentInvoiceItems/prior-9",
          },
        ],
        ref: "CommitmentInvoices/inv-4",
      },
    ],
    changeOrders: [
      {
        id: "co-7",
        number: "007",
        amount: 300_000,
        status: "pending",
        ref: "CommitmentChanges/co-7",
      },
    ],
    budget: { balanceToFinish: 2_500_000 },
    assemblySteps: [],
    ...overrides,
  };
}

test("flags over-billing when cumulative exceeds SOV ceiling", () => {
  const result = evaluateInvoiceChecks(buildSamplePack(), {
    tolerances: DEFAULT_TOLERANCES,
    enabledChecks: { ...DEFAULT_ENABLED_CHECKS, DUPLICATE: false, RETAINAGE: false, MATH: false, CO_UNAPPROVED: false, FRONT_LOADING: false, LARGE_PERIOD: false, PROGRESS: false, RFI_SCOPE: false },
  });

  const overBilling = result.flags.filter((flag) => flag.code === "OVER_BILLING");
  assert.ok(overBilling.length >= 1);
  assert.equal(overBilling[0]?.severity, "HIGH");
});

test("flags duplicate when same line billed in prior draw", () => {
  const pack = buildSamplePack({
    invoice: {
      ...buildSamplePack().invoice,
      lines: [
        {
          lineNo: "9",
          description: "Stored materials",
          budgetLineItemId: "bli-9",
          thisPeriod: 450_000,
          amount: 450_000,
          retainagePercent: 0.1,
          retainageAmount: 45_000,
          ref: "CommitmentInvoiceItems/line-9",
        },
      ],
    },
  });

  const result = evaluateInvoiceChecks(pack, {
    tolerances: DEFAULT_TOLERANCES,
    enabledChecks: { ...DEFAULT_ENABLED_CHECKS, OVER_BILLING: false, RETAINAGE: false, MATH: false, CO_UNAPPROVED: false, FRONT_LOADING: false, LARGE_PERIOD: false, PROGRESS: false, RFI_SCOPE: false },
  });

  assert.ok(result.flags.some((flag) => flag.code === "DUPLICATE"));
});

test("respects disabled checks", () => {
  const result = evaluateInvoiceChecks(buildSamplePack(), {
    tolerances: DEFAULT_TOLERANCES,
    enabledChecks: { ...DEFAULT_ENABLED_CHECKS, OVER_BILLING: false, DUPLICATE: false, RETAINAGE: false, MATH: false, CO_UNAPPROVED: false, FRONT_LOADING: false, LARGE_PERIOD: false, PROGRESS: false, RFI_SCOPE: false },
  });

  assert.equal(result.flags.length, 0);
});
