"use client";

import { FileCheckIcon, LoaderIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToleranceThresholdFields } from "@/components/settings/tolerance-threshold-fields";
import {
  DEFAULT_INVOICE_REVIEW_ENABLED_CHECKS,
  DEFAULT_INVOICE_REVIEW_TOLERANCES,
  INVOICE_CHECK_LABELS,
  TOLERANCE_FIELD_STEPS,
} from "@/lib/invoice-review/defaults";
import { normalizeTolerances } from "@/lib/invoice-review/tolerance-input";
import type {
  InvoiceReviewConfig,
  InvoiceReviewEnabledChecks,
  InvoiceReviewTolerances,
} from "@/lib/invoice-review/types";
import type { PersonaPublic } from "@/lib/personas/types";
import { fetcher } from "@/lib/utils";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type PersonasResponse = {
  personas: PersonaPublic[];
};

type InvoiceReviewSetupFormProps = {
  onProceed: (config: InvoiceReviewConfig) => void | Promise<void>;
};

/**
 * Pre-chat setup for Invoice Review Advisor: persona, tolerances, check toggles.
 */
export function InvoiceReviewSetupForm({
  onProceed,
}: InvoiceReviewSetupFormProps) {
  const { data, isLoading } = useSWR<PersonasResponse>(
    `${basePath}/api/personas`,
    fetcher
  );

  const enabledPersonas = useMemo(
    () => (data?.personas ?? []).filter((persona) => persona.enabled),
    [data?.personas]
  );
  const [personaId, setPersonaId] = useState("");
  const [tolerances, setTolerances] = useState<InvoiceReviewTolerances>(
    DEFAULT_INVOICE_REVIEW_TOLERANCES
  );
  const [enabledChecks, setEnabledChecks] =
    useState<InvoiceReviewEnabledChecks>(DEFAULT_INVOICE_REVIEW_ENABLED_CHECKS);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (enabledPersonas.length > 0 && !personaId) {
      setPersonaId(enabledPersonas[0].id);
    }
  }, [enabledPersonas, personaId]);

  useEffect(() => {
    if (!personaId) {
      return;
    }
    const selected = enabledPersonas.find((persona) => persona.id === personaId);
    if (!selected) {
      return;
    }
    setTolerances(
      normalizeTolerances(selected.defaultTolerances, TOLERANCE_FIELD_STEPS)
    );
    setEnabledChecks(selected.defaultEnabledChecks);
    // Reset defaults only when the user picks a different persona.
  }, [personaId]);

  const selectedPersona = enabledPersonas.find((p) => p.id === personaId);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPersona) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onProceed({
        personaId: selectedPersona.id,
        personaName: selectedPersona.name,
        personaInstructions: selectedPersona.instructions,
        tolerances,
        enabledChecks,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground text-sm">
        <LoaderIcon />
        <span className="ml-2">Loading personas…</span>
      </div>
    );
  }

  return (
    <form
      className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4"
      onSubmit={handleSubmit}
    >
      <div className="space-y-1 text-center">
        <div className="flex items-center justify-center gap-2">
          <FileCheckIcon className="size-5 text-emerald-600" />
          <h2 className="font-semibold text-xl tracking-tight">
            Invoice Review Advisor
          </h2>
        </div>
        <p className="text-muted-foreground text-sm">
          Choose a review persona and tune tolerances before starting.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-border/60 bg-card/50 p-6">
        <div className="space-y-2">
          <Label htmlFor="persona-select">Review persona</Label>
          <Select onValueChange={setPersonaId} value={personaId}>
            <SelectTrigger id="persona-select">
              <SelectValue placeholder="Select persona" />
            </SelectTrigger>
            <SelectContent>
              {enabledPersonas.map((persona) => (
                <SelectItem key={persona.id} value={persona.id}>
                  {persona.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedPersona?.description ? (
            <p className="text-muted-foreground text-xs">
              {selectedPersona.description}
            </p>
          ) : null}
        </div>

        <ToleranceThresholdFields
          idPrefix="tol"
          onChange={setTolerances}
          tolerances={tolerances}
        />

        <div className="space-y-3">
          <h3 className="font-medium text-sm">Deterministic checks</h3>
          <div className="grid gap-2">
            {(Object.keys(INVOICE_CHECK_LABELS) as Array<
              keyof InvoiceReviewEnabledChecks
            >).map((code) => (
              <label
                className="flex cursor-pointer items-center gap-2 text-sm"
                key={code}
              >
                <input
                  checked={enabledChecks[code]}
                  className="size-4 rounded border-border"
                  onChange={(event) =>
                    setEnabledChecks((current) => ({
                      ...current,
                      [code]: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                {INVOICE_CHECK_LABELS[code]}
              </label>
            ))}
          </div>
        </div>
      </div>

      <Button
        className="w-full"
        disabled={!selectedPersona || isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Starting…" : "Start invoice review session"}
      </Button>
    </form>
  );
}

export function buildInvoiceReviewKickoffText(): string {
  return `I'm ready to review an invoice. I can reference an invoice in e-Builder (project, commitment, invoice number) or attach a PDF. What should we review?`;
}
