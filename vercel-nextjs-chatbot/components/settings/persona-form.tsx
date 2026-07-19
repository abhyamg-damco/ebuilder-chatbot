"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { LoaderIcon } from "@/components/chat/icons";
import { toast } from "@/components/chat/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToleranceThresholdFields } from "@/components/settings/tolerance-threshold-fields";
import {
  DEFAULT_INVOICE_REVIEW_ENABLED_CHECKS,
  DEFAULT_INVOICE_REVIEW_TOLERANCES,
  INVOICE_CHECK_LABELS,
  TOLERANCE_FIELD_STEPS,
} from "@/lib/invoice-review/defaults";
import { normalizeTolerances } from "@/lib/invoice-review/tolerance-input";
import type {
  InvoiceReviewEnabledChecks,
  InvoiceReviewTolerances,
} from "@/lib/invoice-review/types";
import type {
  CreatePersonaInput,
  PersonaPublic,
} from "@/lib/personas/types";
import { slugifyPersonaName } from "@/lib/personas/utils";
import { fetcher } from "@/lib/utils";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const MAX_INSTRUCTIONS_LENGTH = 16_384;

export type PersonaFormValues = {
  name: string;
  slug: string;
  description: string;
  instructions: string;
  defaultTolerances: InvoiceReviewTolerances;
  defaultEnabledChecks: InvoiceReviewEnabledChecks;
  enabled: boolean;
};

const defaultValues: PersonaFormValues = {
  name: "",
  slug: "",
  description: "",
  instructions: "",
  defaultTolerances: DEFAULT_INVOICE_REVIEW_TOLERANCES,
  defaultEnabledChecks: DEFAULT_INVOICE_REVIEW_ENABLED_CHECKS,
  enabled: true,
};

function toFormValues(persona: PersonaPublic): PersonaFormValues {
  return {
    name: persona.name,
    slug: persona.slug,
    description: persona.description ?? "",
    instructions: persona.instructions,
    defaultTolerances: normalizeTolerances(
      persona.defaultTolerances,
      TOLERANCE_FIELD_STEPS
    ),
    defaultEnabledChecks: persona.defaultEnabledChecks,
    enabled: persona.enabled,
  };
}

function toPayload(values: PersonaFormValues): CreatePersonaInput {
  return {
    name: values.name.trim(),
    slug: values.slug.trim(),
    description: values.description.trim() || undefined,
    instructions: values.instructions.trim(),
    defaultTolerances: values.defaultTolerances,
    defaultEnabledChecks: values.defaultEnabledChecks,
    enabled: values.enabled,
  };
}

/** Create or edit an invoice review persona. */
export function PersonaForm({ personaId }: { personaId?: string }) {
  const router = useRouter();
  const isEditing = Boolean(personaId);
  const slugManuallyEdited = useRef(false);

  const { data, isLoading } = useSWR<{ persona: PersonaPublic }>(
    isEditing ? `${basePath}/api/personas/${personaId}` : null,
    fetcher
  );

  const [values, setValues] = useState<PersonaFormValues>(defaultValues);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (data?.persona) {
      setValues(toFormValues(data.persona));
    }
  }, [data?.persona]);

  const handleNameChange = (name: string) => {
    setValues((current) => ({
      ...current,
      name,
      slug: slugManuallyEdited.current
        ? current.slug
        : slugifyPersonaName(name),
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const payload = toPayload(values);
      const url = isEditing
        ? `${basePath}/api/personas/${personaId}`
        : `${basePath}/api/personas`;
      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save persona");
      }

      toast({
        type: "success",
        description: isEditing ? "Persona updated" : "Persona created",
      });
      router.push(`${basePath}/settings/personas`);
      router.refresh();
    } catch {
      toast({ type: "error", description: "Failed to save persona" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing && isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground text-sm">
        <LoaderIcon />
        <span className="ml-2">Loading persona…</span>
      </div>
    );
  }

  return (
    <form
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6 md:p-10"
      onSubmit={handleSubmit}
    >
      <div className="space-y-1">
        <h1 className="font-semibold text-xl tracking-tight">
          {isEditing ? "Edit persona" : "New persona"}
        </h1>
        <p className="text-muted-foreground text-sm">
          Define review style, default tolerances, and check toggles for
          Invoice Review Advisor sessions.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-border/60 bg-card/50 p-6">
        <div className="space-y-2">
          <Label htmlFor="persona-name">Name</Label>
          <Input
            id="persona-name"
            onChange={(event) => handleNameChange(event.target.value)}
            placeholder="Conservative Auditor"
            required
            value={values.name}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="persona-slug">Slug</Label>
          <Input
            className="font-mono"
            id="persona-slug"
            onChange={(event) => {
              slugManuallyEdited.current = true;
              setValues((current) => ({
                ...current,
                slug: event.target.value.toLowerCase(),
              }));
            }}
            pattern="[a-z0-9][a-z0-9-]*"
            placeholder="conservative-auditor"
            required
            value={values.slug}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="persona-description">Description</Label>
          <Input
            id="persona-description"
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            placeholder="Short summary shown in persona picker"
            value={values.description}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="persona-instructions">Review instructions</Label>
            <span className="text-muted-foreground text-xs">
              {values.instructions.length.toLocaleString()} /{" "}
              {MAX_INSTRUCTIONS_LENGTH.toLocaleString()}
            </span>
          </div>
          <Textarea
            className="min-h-48 text-[13px] leading-relaxed"
            id="persona-instructions"
            maxLength={MAX_INSTRUCTIONS_LENGTH}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                instructions: event.target.value,
              }))
            }
            placeholder="Apply tight tolerances; flag every material variance..."
            required
            value={values.instructions}
          />
        </div>

        <ToleranceThresholdFields
          idPrefix="persona-tol"
          onChange={(defaultTolerances) =>
            setValues((current) => ({ ...current, defaultTolerances }))
          }
          title="Default tolerance thresholds"
          tolerances={values.defaultTolerances}
        />

        <div className="space-y-3">
          <h3 className="font-medium text-sm">Default enabled checks</h3>
          <div className="grid gap-2">
            {(Object.keys(INVOICE_CHECK_LABELS) as Array<
              keyof InvoiceReviewEnabledChecks
            >).map((code) => (
              <label
                className="flex cursor-pointer items-center gap-2 text-sm"
                key={code}
              >
                <input
                  checked={values.defaultEnabledChecks[code]}
                  className="size-4 rounded border-border"
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      defaultEnabledChecks: {
                        ...current.defaultEnabledChecks,
                        [code]: event.target.checked,
                      },
                    }))
                  }
                  type="checkbox"
                />
                {INVOICE_CHECK_LABELS[code]}
              </label>
            ))}
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            checked={values.enabled}
            className="size-4 rounded border-border"
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                enabled: event.target.checked,
              }))
            }
            type="checkbox"
          />
          Enabled (available in invoice review setup)
        </label>
      </div>

      <div className="flex items-center gap-2">
        <Button disabled={isSaving} type="submit">
          {isSaving ? "Saving…" : isEditing ? "Save changes" : "Create persona"}
        </Button>
        <Button
          onClick={() => router.push(`${basePath}/settings/personas`)}
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
