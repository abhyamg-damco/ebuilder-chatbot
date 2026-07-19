import { z } from "zod";
import {
  DEFAULT_INVOICE_REVIEW_ENABLED_CHECKS,
  DEFAULT_INVOICE_REVIEW_TOLERANCES,
} from "@/lib/invoice-review/defaults";

const tolerancesSchema = z.object({
  overBillPct: z.number(),
  overBillMinUsd: z.number(),
  mathMinUsd: z.number(),
  retentionPctTol: z.number(),
  frontLoadPct: z.number(),
  largePeriodPct: z.number(),
});

const enabledChecksSchema = z.object({
  OVER_BILLING: z.boolean(),
  DUPLICATE: z.boolean(),
  RETAINAGE: z.boolean(),
  MATH: z.boolean(),
  CO_UNAPPROVED: z.boolean(),
  FRONT_LOADING: z.boolean(),
  PROGRESS: z.boolean(),
  RFI_SCOPE: z.boolean(),
  LARGE_PERIOD: z.boolean(),
});

const slugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-]*$/);

const basePersonaFields = {
  name: z.string().min(1).max(128),
  slug: slugSchema,
  description: z.string().max(500).optional(),
  instructions: z.string().min(1).max(16_384),
  defaultTolerances: tolerancesSchema.default(DEFAULT_INVOICE_REVIEW_TOLERANCES),
  defaultEnabledChecks: enabledChecksSchema.default(
    DEFAULT_INVOICE_REVIEW_ENABLED_CHECKS
  ),
  enabled: z.boolean().default(true),
};

export const createPersonaSchema = z.object(basePersonaFields);
export const updatePersonaSchema = z.object({
  name: basePersonaFields.name.optional(),
  slug: slugSchema.optional(),
  description: z.string().max(500).nullable().optional(),
  instructions: basePersonaFields.instructions.optional(),
  defaultTolerances: tolerancesSchema.optional(),
  defaultEnabledChecks: enabledChecksSchema.optional(),
  enabled: z.boolean().optional(),
});

export type CreatePersonaInput = z.infer<typeof createPersonaSchema>;
export type UpdatePersonaInput = z.infer<typeof updatePersonaSchema>;

export type PersonaPublic = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  instructions: string;
  defaultTolerances: z.infer<typeof tolerancesSchema>;
  defaultEnabledChecks: z.infer<typeof enabledChecksSchema>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ActivePersona = {
  id: string;
  name: string;
  instructions: string;
  defaultTolerances: z.infer<typeof tolerancesSchema>;
  defaultEnabledChecks: z.infer<typeof enabledChecksSchema>;
};
