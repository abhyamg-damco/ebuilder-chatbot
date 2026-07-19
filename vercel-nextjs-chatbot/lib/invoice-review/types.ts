/** Deterministic check codes for invoice review. */
export type InvoiceReviewCheckCode =
  | "OVER_BILLING"
  | "DUPLICATE"
  | "RETAINAGE"
  | "MATH"
  | "CO_UNAPPROVED"
  | "FRONT_LOADING"
  | "PROGRESS"
  | "RFI_SCOPE"
  | "LARGE_PERIOD";

/** Editable tolerance thresholds configured at chat creation. */
export type InvoiceReviewTolerances = {
  overBillPct: number;
  overBillMinUsd: number;
  mathMinUsd: number;
  retentionPctTol: number;
  frontLoadPct: number;
  largePeriodPct: number;
};

/** Per-check enable toggles (default all enabled). */
export type InvoiceReviewEnabledChecks = Record<
  InvoiceReviewCheckCode,
  boolean
>;

/** Per-chat configuration persisted on the Chat row. */
export type InvoiceReviewConfig = {
  personaId?: string;
  personaName: string;
  personaInstructions: string;
  tolerances: InvoiceReviewTolerances;
  enabledChecks: InvoiceReviewEnabledChecks;
};

/** Structured advisory brief artifact content (JSON). */
export type AdvisoryBriefContent = {
  riskRating: "LOW" | "MEDIUM" | "HIGH";
  title: string;
  invoiceNumber?: string;
  vendor?: string;
  periodAmount?: number;
  drawLabel?: string;
  contractSummary?: {
    contractValue: number;
    approvedCos: number;
    billedToDate: number;
    retainageHeld: number;
  };
  flags: Array<{
    code: string;
    severity: string;
    amountUsd: number;
    message: string;
    citations: string[];
  }>;
  passedChecks: Array<{
    code: string;
    message: string;
  }>;
  recommendation: string;
};
