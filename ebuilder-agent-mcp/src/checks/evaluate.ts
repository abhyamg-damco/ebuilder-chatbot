import type {
  CheckCode,
  EvidencePack,
  ReviewConfig,
  ReviewFlag,
  ReviewResult,
  ReviewTolerances,
} from "./types.js";

type CheckFn = (pack: EvidencePack, tol: ReviewTolerances) => ReviewFlag[];

function fmtUsd(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function severityRank(severity: ReviewFlag["severity"]): number {
  switch (severity) {
    case "HIGH":
      return 3;
    case "MED":
      return 2;
    case "NOTE":
      return 1;
    default:
      return 0;
  }
}

/** Check cumulative billing against contract + approved CO ceiling (two-way). */
const checkOverBilling: CheckFn = (pack, tol) => {
  const flags: ReviewFlag[] = [];
  const ceiling = pack.commitment.currentContractValue;

  for (const line of pack.invoice.lines) {
    const sovLine = pack.commitment.sov.find(
      (sov) =>
        sov.budgetLineItemId === line.budgetLineItemId ||
        sov.lineNo === line.lineNo
    );
    const lineCeiling = sovLine?.currentValue ?? ceiling;
    const priorApproved = sovLine?.actualsApproved ?? 0;
    const cumulative = priorApproved + line.thisPeriod;
    const over = cumulative - lineCeiling;

    if (over > tol.overBillMinUsd && lineCeiling > 0 && over / lineCeiling > tol.overBillPct) {
      flags.push({
        code: "OVER_BILLING",
        severity: over > 500_000 ? "HIGH" : "MED",
        amountUsd: over,
        message: `Line ${line.lineNo} (${line.description}) billed ${fmtUsd(over)} over its SOV ceiling.`,
        citations: [line.ref, sovLine?.ref ?? pack.commitment.ref],
      });
    }
  }

  const totalCumulative =
    pack.commitment.actualsApproved + pack.invoice.invoiceAmount;
  const totalOver = totalCumulative - ceiling;
  if (
    totalOver > tol.overBillMinUsd &&
    ceiling > 0 &&
    totalOver / ceiling > tol.overBillPct &&
    flags.length === 0
  ) {
    flags.push({
      code: "OVER_BILLING",
      severity: totalOver > 500_000 ? "HIGH" : "MED",
      amountUsd: totalOver,
      message: `Invoice total exceeds commitment ceiling by ${fmtUsd(totalOver)}.`,
      citations: [pack.invoice.ref, pack.commitment.ref],
    });
  }

  return flags;
};

/** Detect duplicate line charges vs prior invoices. */
const checkDuplicates: CheckFn = (pack) => {
  const flags: ReviewFlag[] = [];
  const priorKeys = new Set<string>();

  for (const prior of pack.priorInvoices) {
    for (const line of prior.lines) {
      priorKeys.add(
        `${line.budgetLineItemId ?? line.lineNo}|${line.thisPeriod}|${line.description}`
      );
    }
  }

  for (const line of pack.invoice.lines) {
    const key = `${line.budgetLineItemId ?? line.lineNo}|${line.thisPeriod}|${line.description}`;
    if (line.thisPeriod > 0 && priorKeys.has(key)) {
      flags.push({
        code: "DUPLICATE",
        severity: line.thisPeriod > 100_000 ? "HIGH" : "MED",
        amountUsd: line.thisPeriod,
        message: `Line ${line.lineNo} may duplicate a charge already billed in a prior draw.`,
        citations: [line.ref, ...pack.priorInvoices.map((prior) => prior.ref)],
      });
    }
  }

  return flags;
};

/** Verify retainage withheld matches contract percentage. */
const checkRetainage: CheckFn = (pack, tol) => {
  const flags: ReviewFlag[] = [];
  const expectedPct = pack.commitment.retainagePercent / 100;

  if (expectedPct <= 0) {
    return flags;
  }

  for (const line of pack.invoice.lines) {
    if (line.thisPeriod <= 0) {
      continue;
    }
    const actualPct =
      line.retainagePercent > 1
        ? line.retainagePercent / 100
        : line.retainagePercent;
    const gap = Math.abs(actualPct - expectedPct);
    if (gap <= tol.retentionPctTol) {
      continue;
    }
    const dollarGap = Math.abs((expectedPct - actualPct) * line.thisPeriod);
    flags.push({
      code: "RETAINAGE",
      severity: dollarGap > 50_000 ? "MED" : "NOTE",
      amountUsd: dollarGap,
      message: `Line ${line.lineNo} withheld ${(actualPct * 100).toFixed(1)}% vs contract ${pack.commitment.retainagePercent}%.`,
      citations: [line.ref, pack.commitment.ref],
    });
  }

  return flags;
};

/** Reconcile line sums and amount-less-retainage math. */
const checkMath: CheckFn = (pack, tol) => {
  const flags: ReviewFlag[] = [];
  const lineSum = pack.invoice.lines.reduce(
    (acc, line) => acc + line.thisPeriod,
    0
  );
  const headerGap = Math.abs(lineSum - pack.invoice.invoiceAmount);
  if (headerGap > tol.mathMinUsd) {
    flags.push({
      code: "MATH",
      severity: headerGap > 10_000 ? "MED" : "NOTE",
      amountUsd: headerGap,
      message: `Line items sum ${fmtUsd(lineSum)} but invoice header is ${fmtUsd(pack.invoice.invoiceAmount)}.`,
      citations: [pack.invoice.ref],
    });
  }

  const expectedLessRetainage =
    pack.invoice.invoiceAmount - pack.invoice.amountRetained;
  const retainageGap = Math.abs(
    expectedLessRetainage - pack.invoice.amountLessRetainage
  );
  if (retainageGap > tol.mathMinUsd && pack.invoice.amountLessRetainage > 0) {
    flags.push({
      code: "MATH",
      severity: "NOTE",
      amountUsd: retainageGap,
      message: `Amount less retainage does not reconcile by ${fmtUsd(retainageGap)}.`,
      citations: [pack.invoice.ref],
    });
  }

  return flags;
};

/** Flag billing that may rely on pending (unapproved) change orders. */
const checkCoUnapproved: CheckFn = (pack, tol) => {
  const flags: ReviewFlag[] = [];
  const pendingTotal = pack.changeOrders
    .filter((change) => change.status === "pending")
    .reduce((acc, change) => acc + change.amount, 0);

  if (pendingTotal <= 0) {
    return flags;
  }

  const approvedCeiling = pack.commitment.originalContractValue +
    pack.commitment.approvedChanges;
  const billedBeyondApproved =
    pack.commitment.actualsApproved +
    pack.invoice.invoiceAmount -
    approvedCeiling;

  if (billedBeyondApproved > tol.overBillMinUsd) {
    flags.push({
      code: "CO_UNAPPROVED",
      severity: billedBeyondApproved > 500_000 ? "HIGH" : "MED",
      amountUsd: billedBeyondApproved,
      message: `${fmtUsd(billedBeyondApproved)} appears to bill against pending change orders (${fmtUsd(pendingTotal)} pending).`,
      citations: [
        pack.invoice.ref,
        pack.commitment.ref,
        ...pack.changeOrders
          .filter((change) => change.status === "pending")
          .map((change) => change.ref),
      ],
    });
  }

  return flags;
};

/** Detect front-loading when current draw exceeds trailing trend. */
const checkFrontLoading: CheckFn = (pack, tol) => {
  const flags: ReviewFlag[] = [];
  if (pack.priorInvoices.length === 0) {
    return flags;
  }

  for (const line of pack.invoice.lines) {
    const priorAmounts = pack.priorInvoices
      .flatMap((prior) => prior.lines)
      .filter(
        (priorLine) =>
          priorLine.budgetLineItemId === line.budgetLineItemId ||
          priorLine.lineNo === line.lineNo
      )
      .map((priorLine) => priorLine.thisPeriod)
      .filter((amount) => amount > 0);

    if (priorAmounts.length === 0 || line.thisPeriod <= 0) {
      continue;
    }

    const avgPrior =
      priorAmounts.reduce((acc, amount) => acc + amount, 0) /
      priorAmounts.length;
    if (avgPrior <= 0) {
      continue;
    }

    const drift = (line.thisPeriod - avgPrior) / avgPrior;
    if (drift > tol.frontLoadPct) {
      flags.push({
        code: "FRONT_LOADING",
        severity: drift > 0.5 ? "MED" : "NOTE",
        amountUsd: line.thisPeriod - avgPrior,
        message: `Line ${line.lineNo} is ${(drift * 100).toFixed(0)}% above its trailing draw average.`,
        citations: [line.ref, ...pack.priorInvoices.map((prior) => prior.ref)],
      });
    }
  }

  return flags;
};

/** Note when this period exceeds trailing invoice average. */
const checkLargePeriod: CheckFn = (pack, tol) => {
  if (pack.priorInvoices.length === 0) {
    return [];
  }

  const priorAmounts = pack.priorInvoices
    .slice(0, 4)
    .map((prior) => prior.invoiceAmount)
    .filter((amount) => amount > 0);
  if (priorAmounts.length === 0) {
    return [];
  }

  const avgPrior =
    priorAmounts.reduce((acc, amount) => acc + amount, 0) / priorAmounts.length;
  if (avgPrior <= 0) {
    return [];
  }

  const drift = (pack.invoice.invoiceAmount - avgPrior) / avgPrior;
  if (drift <= tol.largePeriodPct) {
    return [];
  }

  return [
    {
      code: "LARGE_PERIOD",
      severity: drift > 0.5 ? "MED" : "NOTE",
      amountUsd: pack.invoice.invoiceAmount - avgPrior,
      message: `This period is ${(drift * 100).toFixed(0)}% above the trailing ${priorAmounts.length}-draw average.`,
      citations: [
        pack.invoice.ref,
        ...pack.priorInvoices.slice(0, 4).map((prior) => prior.ref),
      ],
    },
  ];
};

const RULE_CHECKS: Record<CheckCode, CheckFn> = {
  OVER_BILLING: checkOverBilling,
  DUPLICATE: checkDuplicates,
  RETAINAGE: checkRetainage,
  MATH: checkMath,
  CO_UNAPPROVED: checkCoUnapproved,
  FRONT_LOADING: checkFrontLoading,
  PROGRESS: () => [],
  RFI_SCOPE: () => [],
  LARGE_PERIOD: checkLargePeriod,
};

const CHECK_PASSED_MESSAGES: Record<CheckCode, string> = {
  OVER_BILLING: "Cumulative billing within contract + approved CO ceiling.",
  DUPLICATE: "No duplicate line charges detected vs prior draws.",
  RETAINAGE: "Retainage withheld at contract percentage.",
  MATH: "Line totals and retainage math reconcile.",
  CO_UNAPPROVED: "Billing covered by approved contract and change orders.",
  FRONT_LOADING: "No significant front-loading vs trailing draws.",
  PROGRESS: "Progress plausibility deferred to AI review.",
  RFI_SCOPE: "RFI scope review deferred to AI review.",
  LARGE_PERIOD: "Period amount within trailing draw average.",
};

/** Run all enabled deterministic checks and derive risk rating. */
export function evaluateInvoiceChecks(
  pack: EvidencePack,
  config: ReviewConfig
): ReviewResult {
  const flags: ReviewFlag[] = [];
  const passedChecks: ReviewFlag[] = [];

  for (const [code, enabled] of Object.entries(config.enabledChecks) as Array<
    [CheckCode, boolean]
  >) {
    if (!enabled) {
      continue;
    }

    const checkFn = RULE_CHECKS[code];
    const checkFlags = checkFn(pack, config.tolerances);

    if (checkFlags.length === 0 && code !== "PROGRESS" && code !== "RFI_SCOPE") {
      passedChecks.push({
        code,
        severity: "PASSED",
        amountUsd: 0,
        message: CHECK_PASSED_MESSAGES[code],
        citations: [pack.invoice.ref],
      });
    } else {
      flags.push(...checkFlags);
    }
  }

  flags.sort(
    (a, b) =>
      severityRank(b.severity) - severityRank(a.severity) ||
      b.amountUsd - a.amountUsd
  );

  const highCount = flags.filter((flag) => flag.severity === "HIGH").length;
  const medCount = flags.filter((flag) => flag.severity === "MED").length;
  const noteCount = flags.filter((flag) => flag.severity === "NOTE").length;
  const totalFlaggedUsd = flags.reduce((acc, flag) => acc + flag.amountUsd, 0);

  let riskRating: ReviewResult["riskRating"] = "LOW";
  if (highCount > 0 || totalFlaggedUsd > 1_000_000) {
    riskRating = "HIGH";
  } else if (medCount > 0 || noteCount > 1) {
    riskRating = "MEDIUM";
  }

  return {
    flags,
    passedChecks,
    riskRating,
    summary: { highCount, medCount, noteCount, totalFlaggedUsd },
  };
}
