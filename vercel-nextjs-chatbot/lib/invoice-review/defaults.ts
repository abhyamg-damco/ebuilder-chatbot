import type {
  InvoiceReviewCheckCode,
  InvoiceReviewEnabledChecks,
  InvoiceReviewTolerances,
} from "./types";

/** Smart default tolerances (editable at chat creation). */
export const DEFAULT_INVOICE_REVIEW_TOLERANCES: InvoiceReviewTolerances = {
  overBillPct: 0.02,
  overBillMinUsd: 10_000,
  mathMinUsd: 100,
  retentionPctTol: 0.0025,
  frontLoadPct: 0.15,
  largePeriodPct: 0.2,
};

/** All checks enabled by default. */
export const DEFAULT_INVOICE_REVIEW_ENABLED_CHECKS: InvoiceReviewEnabledChecks =
  {
    OVER_BILLING: true,
    DUPLICATE: true,
    RETAINAGE: true,
    MATH: true,
    CO_UNAPPROVED: true,
    FRONT_LOADING: true,
    PROGRESS: true,
    RFI_SCOPE: true,
    LARGE_PERIOD: true,
  };

/** Human-readable labels for the setup form toggles. */
export const INVOICE_CHECK_LABELS: Record<InvoiceReviewCheckCode, string> = {
  OVER_BILLING: "Over-billing vs contract + approved COs",
  DUPLICATE: "Duplicate line / stored materials",
  RETAINAGE: "Retainage % withheld correctly",
  MATH: "Rates, tax, and arithmetic reconcile",
  CO_UNAPPROVED: "Billed work covered by approved CO",
  FRONT_LOADING: "Front-loading / SOV drift",
  PROGRESS: "Progress plausibility (AI-assisted)",
  RFI_SCOPE: "Scope tied to open RFI (AI-assisted)",
  LARGE_PERIOD: "Period vs trailing draw average",
};

/** Tolerance field labels for the setup form. */
export const TOLERANCE_FIELD_LABELS: Record<
  keyof InvoiceReviewTolerances,
  { label: string; hint: string; step: string }
> = {
  overBillPct: {
    label: "Over-bill % threshold",
    hint: "Flag when variance exceeds this % (0.02 = 2%)",
    step: "0.001",
  },
  overBillMinUsd: {
    label: "Over-bill minimum ($)",
    hint: "Ignore variances below this dollar amount",
    step: "1000",
  },
  mathMinUsd: {
    label: "Math tolerance ($)",
    hint: "Rounding / arithmetic mismatch threshold",
    step: "10",
  },
  retentionPctTol: {
    label: "Retainage % tolerance",
    hint: "Allowed deviation from contract retainage %",
    step: "0.0001",
  },
  frontLoadPct: {
    label: "Front-load % threshold",
    hint: "Line billed this much above trailing average",
    step: "0.01",
  },
  largePeriodPct: {
    label: "Large period % threshold",
    hint: "This draw vs trailing average",
    step: "0.01",
  },
};

/** Step strings keyed by tolerance field (for input snapping). */
export const TOLERANCE_FIELD_STEPS = Object.fromEntries(
  Object.entries(TOLERANCE_FIELD_LABELS).map(([key, value]) => [key, value.step])
) as Record<keyof InvoiceReviewTolerances, string>;

/** Merge partial config with defaults. */
export function mergeInvoiceReviewConfig(partial?: {
  tolerances?: Partial<InvoiceReviewTolerances>;
  enabledChecks?: Partial<InvoiceReviewEnabledChecks>;
}): {
  tolerances: InvoiceReviewTolerances;
  enabledChecks: InvoiceReviewEnabledChecks;
} {
  return {
    tolerances: {
      ...DEFAULT_INVOICE_REVIEW_TOLERANCES,
      ...partial?.tolerances,
    },
    enabledChecks: {
      ...DEFAULT_INVOICE_REVIEW_ENABLED_CHECKS,
      ...partial?.enabledChecks,
    },
  };
}
