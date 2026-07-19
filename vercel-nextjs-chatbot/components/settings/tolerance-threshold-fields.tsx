"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TOLERANCE_FIELD_LABELS } from "@/lib/invoice-review/defaults";
import { parseToleranceInput } from "@/lib/invoice-review/tolerance-input";
import type { InvoiceReviewTolerances } from "@/lib/invoice-review/types";

type ToleranceThresholdFieldsProps = {
  idPrefix: string;
  onChange: (tolerances: InvoiceReviewTolerances) => void;
  tolerances: InvoiceReviewTolerances;
  title?: string;
};

/** Editable tolerance threshold grid with step-aligned number inputs. */
export function ToleranceThresholdFields({
  idPrefix,
  onChange,
  tolerances,
  title = "Tolerance thresholds",
}: ToleranceThresholdFieldsProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {(Object.keys(TOLERANCE_FIELD_LABELS) as Array<
          keyof InvoiceReviewTolerances
        >).map((key) => {
          const field = TOLERANCE_FIELD_LABELS[key];
          return (
            <div className="space-y-1" key={key}>
              <Label htmlFor={`${idPrefix}-${key}`}>{field.label}</Label>
              <Input
                id={`${idPrefix}-${key}`}
                min={0}
                onChange={(event) => {
                  const next = parseToleranceInput(
                    event.target.value,
                    tolerances[key],
                    field.step
                  );
                  onChange({ ...tolerances, [key]: next });
                }}
                step={field.step}
                type="number"
                value={tolerances[key]}
              />
              <p className="text-[11px] text-muted-foreground">{field.hint}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
