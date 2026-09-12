import { createHash } from "node:crypto";
import type {
  MayoCandidateFinding,
  MayoDocumentExtractionData,
  MayoEvidence,
  MayoNormalizedRule,
  MayoSeverity,
} from "./types";

const DEFAULT_MATH_TOLERANCE_USD = 100;
const DEFAULT_OVERBILL_TOLERANCE_USD = 1;
const DEFAULT_RETAINAGE_TOLERANCE_PCT = 0.0025;
const DEFAULT_LARGE_PERIOD_PCT = 0.2;

/**
 * Rule config percentages are fractions (0.0025 is a quarter of a percent), but
 * extraction reports the contract retainage rate the way the document states it,
 * in percentage points: a 10% contract comes back as `10`. Multiplying by that
 * directly overstated expected retainage by a factor of 100.
 *
 * Anything above 1 is read as percentage points. A retainage rate at or below 1
 * is already a fraction, since a contract withholding 100% of every payment does
 * not exist and rates below 1% are not used in practice.
 */
function toRetainageFraction(rate: number): number {
  return rate > 1 ? rate / 100 : rate;
}

function toEvidence(
  extraction: MayoDocumentExtractionData,
  fallbackFilename: string
): MayoEvidence[] {
  if (extraction.evidence.length > 0) {
    return extraction.evidence;
  }

  return [
    {
      documentId: null,
      openaiFileId: null,
      filename: fallbackFilename,
      excerpt: "Normalized values extracted from the source document.",
      pageNumber: null,
      confidence: extraction.confidence,
    },
  ];
}

function findRule(
  rules: MayoNormalizedRule[],
  code: string
): MayoNormalizedRule | undefined {
  return rules.find((rule) => rule.code === code);
}

function pushFinding(
  findings: MayoCandidateFinding[],
  rule: MayoNormalizedRule | undefined,
  input: Omit<MayoCandidateFinding, "ruleId" | "ruleCode" | "severity">
) {
  if (!rule) {
    return;
  }

  findings.push({
    ...input,
    ruleId: rule.id,
    ruleCode: rule.code,
    severity: rule.severity,
  });
}

export function evaluateMayoDeterministicRules(input: {
  extractions: Array<{
    filename: string;
    data: MayoDocumentExtractionData;
  }>;
  rules: MayoNormalizedRule[];
}): MayoCandidateFinding[] {
  const findings: MayoCandidateFinding[] = [];

  for (const extractionRecord of input.extractions) {
    const extraction = extractionRecord.data;
    const evidence = toEvidence(extraction, extractionRecord.filename);
    const lineCurrentTotal = extraction.lineItems.reduce(
      (sum, line) => sum + (line.currentApplication ?? 0),
      0
    );

    if (extraction.currentPayment !== null && extraction.lineItems.length > 0) {
      const rule = findRule(input.rules, "MATH");
      const tolerance = rule?.config.toleranceUsd ?? DEFAULT_MATH_TOLERANCE_USD;
      const variance = Math.abs(lineCurrentTotal - extraction.currentPayment);

      if (variance > tolerance) {
        pushFinding(findings, rule, {
          title: "Payment total does not reconcile to line items",
          description: `The stated current payment differs from the schedule-of-values line total by $${variance.toFixed(2)}.`,
          amountImpact: variance,
          confidence: extraction.confidence,
          source: "deterministic",
          recommendation:
            "Confirm the source totals and correct the schedule-of-values reconciliation before approval.",
          evidence,
        });
      }
    }

    for (const line of extraction.lineItems) {
      if (line.scheduledValue === null || line.totalCompleted === null) {
        continue;
      }

      const rule = findRule(input.rules, "OVER_BILLING");
      const tolerance =
        rule?.config.toleranceUsd ?? DEFAULT_OVERBILL_TOLERANCE_USD;
      const variance = line.totalCompleted - line.scheduledValue;

      if (variance > tolerance) {
        pushFinding(findings, rule, {
          title: `Potential over-billing on ${line.lineNumber ?? "SOV line"}`,
          description: `"${line.description}" exceeds its scheduled value by $${variance.toFixed(2)}.`,
          amountImpact: variance,
          confidence: line.confidence,
          source: "deterministic",
          recommendation:
            "Verify approved changes or correct the billed-to-date amount for this line.",
          evidence: [
            {
              documentId: null,
              openaiFileId: null,
              filename: extractionRecord.filename,
              excerpt: line.sourceExcerpt,
              pageNumber: line.pageNumber,
              confidence: line.confidence,
            },
          ],
        });
      }
    }

    if (
      extraction.retainagePercent !== null &&
      extraction.totalCompletedAndStored !== null &&
      extraction.retainageAmount !== null
    ) {
      const rule = findRule(input.rules, "RETAINAGE");
      const expectedPct =
        rule?.config.expectedRetainagePct ??
        toRetainageFraction(extraction.retainagePercent);
      const tolerancePct =
        rule?.config.tolerancePct ?? DEFAULT_RETAINAGE_TOLERANCE_PCT;
      const expected = extraction.totalCompletedAndStored * expectedPct;
      const variance = Math.abs(expected - extraction.retainageAmount);
      const allowed = extraction.totalCompletedAndStored * tolerancePct;

      if (variance > allowed) {
        pushFinding(findings, rule, {
          title: "Retainage does not match the expected percentage",
          description: `Expected retainage is $${expected.toFixed(2)}, but the document reports $${extraction.retainageAmount.toFixed(2)}.`,
          amountImpact: variance,
          confidence: extraction.confidence,
          source: "deterministic",
          recommendation:
            "Confirm the contract retainage rate and reconcile the retained amount.",
          evidence,
        });
      }
    }

    if (
      extraction.billedAgainstPendingChangeOrders !== null &&
      extraction.billedAgainstPendingChangeOrders > 0
    ) {
      const rule = findRule(input.rules, "CO_UNAPPROVED");
      pushFinding(findings, rule, {
        title: "Billing references pending or unapproved change work",
        description: `$${extraction.billedAgainstPendingChangeOrders.toFixed(2)} appears billed against pending change orders.`,
        amountImpact: extraction.billedAgainstPendingChangeOrders,
        confidence: extraction.confidence,
        source: "deterministic",
        recommendation:
          "Confirm formal change-order approval before accepting the affected billing.",
        evidence,
      });
    }
  }

  const paymentHistory = input.extractions
    .filter(
      (record) =>
        record.data.currentPayment !== null && record.data.currentPayment > 0
    )
    .sort((left, right) => {
      const leftPeriod = Date.parse(left.data.periodEnd ?? "");
      const rightPeriod = Date.parse(right.data.periodEnd ?? "");
      const leftApplication = Number(left.data.applicationNumber);
      const rightApplication = Number(right.data.applicationNumber);
      const leftSortValue = Number.isFinite(leftPeriod)
        ? leftPeriod
        : Number.isFinite(leftApplication)
          ? leftApplication
          : 0;
      const rightSortValue = Number.isFinite(rightPeriod)
        ? rightPeriod
        : Number.isFinite(rightApplication)
          ? rightApplication
          : 0;
      return leftSortValue - rightSortValue;
    });
  const currentPayments = paymentHistory.map(
    (record) => record.data.currentPayment as number
  );

  if (currentPayments.length >= 3) {
    const latest = currentPayments.at(-1) ?? 0;
    const prior = currentPayments.slice(0, -1);
    const average = prior.reduce((sum, value) => sum + value, 0) / prior.length;
    const rule = findRule(input.rules, "LARGE_PERIOD");
    const tolerancePct = rule?.config.tolerancePct ?? DEFAULT_LARGE_PERIOD_PCT;

    if (average > 0 && latest > average * (1 + tolerancePct)) {
      pushFinding(findings, rule, {
        title: "Current payment is unusually large",
        description: `The current payment is ${(((latest - average) / average) * 100).toFixed(1)}% above the average prior payment.`,
        amountImpact: latest - average,
        confidence: 0.95,
        source: "deterministic",
        recommendation:
          "Review the period-over-period increase and supporting progress evidence.",
        evidence: paymentHistory.flatMap((record) =>
          toEvidence(record.data, record.filename)
        ),
      });
    }
  }

  return findings;
}

export function createMayoFindingFingerprint(input: {
  caseId: string;
  ruleCode: string;
  title: string;
  evidence: MayoEvidence[];
}): string {
  const normalizedEvidence = input.evidence
    .map((item) =>
      [
        item.documentId ?? "",
        item.openaiFileId ?? "",
        item.filename.toLowerCase(),
        item.excerpt.toLowerCase().replace(/\s+/g, " ").trim(),
        item.pageNumber ?? "",
      ].join("|")
    )
    .sort()
    .join("||");

  return createHash("sha256")
    .update(
      [
        input.caseId,
        input.ruleCode,
        input.title.toLowerCase().replace(/\s+/g, " ").trim(),
        normalizedEvidence,
      ].join("::")
    )
    .digest("hex");
}

export function severityRank(severity: MayoSeverity): number {
  return {
    info: 0,
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  }[severity];
}
