import type { CheckCode, EnabledChecks, ReviewTolerances } from "./types.js";

/** Smart default tolerances (editable per chat at creation). */
export const DEFAULT_TOLERANCES: ReviewTolerances = {
  overBillPct: 0.02,
  overBillMinUsd: 10_000,
  mathMinUsd: 100,
  retentionPctTol: 0.0025,
  frontLoadPct: 0.15,
  largePeriodPct: 0.2,
};

/** Build tolerances seeded from tenant cost-control tolerance when available. */
export function buildTolerances(
  costControlTolerancePercent?: number,
  overrides?: Partial<ReviewTolerances>
): ReviewTolerances {
  const tenantPct =
    typeof costControlTolerancePercent === "number" &&
    Number.isFinite(costControlTolerancePercent)
      ? costControlTolerancePercent / 100
      : undefined;

  return {
    ...DEFAULT_TOLERANCES,
    ...(tenantPct !== undefined
      ? {
          overBillPct: Math.min(tenantPct, DEFAULT_TOLERANCES.overBillPct),
          frontLoadPct: Math.max(tenantPct, DEFAULT_TOLERANCES.frontLoadPct),
        }
      : {}),
    ...overrides,
  };
}

/** All deterministic checks enabled by default. */
export const DEFAULT_ENABLED_CHECKS: EnabledChecks = {
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

/** Human-readable labels for check toggles in the chatbot UI. */
export const CHECK_LABELS: Record<CheckCode, string> = {
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

/** Merge partial enabled-check overrides with defaults. */
export function mergeEnabledChecks(
  partial?: Partial<EnabledChecks>
): EnabledChecks {
  return { ...DEFAULT_ENABLED_CHECKS, ...partial };
}
