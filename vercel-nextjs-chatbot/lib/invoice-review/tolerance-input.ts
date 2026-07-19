import type { InvoiceReviewTolerances } from "./types";

/** Decimal places implied by a numeric step string (e.g. "0.001" → 3). */
function stepDecimals(step: string): number {
  if (!step.includes(".")) {
    return 0;
  }
  return step.split(".")[1]?.length ?? 0;
}

/** Snap a value to the nearest valid step so native spinners work reliably. */
export function snapToleranceToStep(value: number, step: string): number {
  const stepNum = Number.parseFloat(step);
  if (!Number.isFinite(stepNum) || stepNum <= 0 || !Number.isFinite(value)) {
    return value;
  }
  const decimals = stepDecimals(step);
  const snapped = Math.round(value / stepNum) * stepNum;
  return Number(snapped.toFixed(decimals));
}

/** Parse a number input change, preserving the previous value when empty/invalid. */
export function parseToleranceInput(
  raw: string,
  previous: number,
  step: string
): number {
  if (raw.trim() === "") {
    return previous;
  }
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) {
    return previous;
  }
  return snapToleranceToStep(parsed, step);
}

/** Normalize all tolerance fields to valid step increments (e.g. after loading from DB). */
export function normalizeTolerances(
  tolerances: InvoiceReviewTolerances,
  steps: Record<keyof InvoiceReviewTolerances, string>
): InvoiceReviewTolerances {
  return (Object.keys(steps) as Array<keyof InvoiceReviewTolerances>).reduce(
    (acc, key) => {
      acc[key] = snapToleranceToStep(tolerances[key], steps[key]);
      return acc;
    },
    {} as InvoiceReviewTolerances
  );
}
