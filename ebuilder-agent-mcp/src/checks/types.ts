/** Severity levels for invoice review flags. */
export type FlagSeverity = "HIGH" | "MED" | "NOTE" | "PASSED";

/** Deterministic check codes aligned with the Invoice Review Advisor one-pager. */
export type CheckCode =
  | "OVER_BILLING"
  | "DUPLICATE"
  | "RETAINAGE"
  | "MATH"
  | "CO_UNAPPROVED"
  | "FRONT_LOADING"
  | "PROGRESS"
  | "RFI_SCOPE"
  | "LARGE_PERIOD";

/** User-configurable tolerance thresholds for deterministic checks. */
export type ReviewTolerances = {
  overBillPct: number;
  overBillMinUsd: number;
  mathMinUsd: number;
  retentionPctTol: number;
  frontLoadPct: number;
  largePeriodPct: number;
};

/** Per-check enable/disable toggles (default all true). */
export type EnabledChecks = Record<CheckCode, boolean>;

/** Single invoice line item normalized from e-Builder /items details. */
export type InvoiceLine = {
  lineNo: string;
  description: string;
  costCode?: string;
  budgetLineItemId?: string;
  thisPeriod: number;
  amount: number;
  retainagePercent: number;
  retainageAmount: number;
  storedMaterials?: number;
  ref: string;
};

/** Schedule-of-values line from commitment /items details. */
export type SovLine = {
  lineNo: string;
  description: string;
  budgetLineItemId?: string;
  scheduledValue: number;
  currentValue: number;
  actualsApproved: number;
  remainingToBePaid: number;
  approvedChanges: number;
  ref: string;
};

/** Prior invoice summary for trend and duplicate checks. */
export type InvoiceSummary = {
  id: string;
  number: string;
  status: string;
  invoiceAmount: number;
  amountRetained: number;
  dateCreated?: string;
  lines: InvoiceLine[];
  ref: string;
};

/** Normalized evidence bundle for deterministic review checks. */
export type EvidencePack = {
  invoice: {
    id: string;
    number: string;
    status: string;
    periodFrom?: string;
    periodTo?: string;
    invoiceAmount: number;
    amountRetained: number;
    retainageReleased: number;
    amountLessRetainage: number;
    commitmentId: string;
    projectId?: string;
    companyId?: string;
    companyName?: string;
    lines: InvoiceLine[];
    ref: string;
  };
  commitment: {
    id: string;
    number: string;
    companyId?: string;
    companyName?: string;
    originalContractValue: number;
    currentContractValue: number;
    approvedChanges: number;
    pendingChanges: number;
    retainagePercent: number;
    currentRetainageHeld: number;
    costControlTolerancePercent: number;
    actualsApproved: number;
    remainingToBePaid: number;
    sov: SovLine[];
    ref: string;
  };
  priorInvoices: InvoiceSummary[];
  changeOrders: Array<{
    id: string;
    number: string;
    amount: number;
    status: "approved" | "pending" | "other";
    ref: string;
  }>;
  budget: {
    balanceToFinish?: number;
    ref?: string;
  };
  assemblySteps: string[];
};

/** Output flag from a deterministic or AI-assisted check. */
export type ReviewFlag = {
  code: CheckCode;
  severity: FlagSeverity;
  amountUsd: number;
  message: string;
  citations: string[];
};

/** Config passed into evaluate_invoice_checks. */
export type ReviewConfig = {
  tolerances: ReviewTolerances;
  enabledChecks: EnabledChecks;
};

/** Result of running all enabled checks. */
export type ReviewResult = {
  flags: ReviewFlag[];
  passedChecks: ReviewFlag[];
  riskRating: "LOW" | "MEDIUM" | "HIGH";
  summary: {
    highCount: number;
    medCount: number;
    noteCount: number;
    totalFlaggedUsd: number;
  };
};
