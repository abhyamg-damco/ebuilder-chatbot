import { z } from "zod";
import {
  mayoDocumentCategorySchema,
  mayoDocumentStageSchema,
  mayoSeveritySchema,
} from "./types";

export const createMayoCaseSchema = z.object({
  name: z.string().trim().min(2).max(200),
  projectName: z.string().trim().min(1).max(200),
  projectNumber: z.string().trim().max(100).optional(),
  description: z.string().trim().max(2000).optional(),
});

export const initiateMayoUploadSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(128),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(512 * 1024 * 1024),
  category: mayoDocumentCategorySchema,
  stage: mayoDocumentStageSchema.default("supporting"),
  revision: z.number().int().positive().default(1),
  paymentApplicationNumber: z.string().trim().max(100).optional(),
});

export const updateMayoFindingSchema = z.object({
  status: z.enum(["open", "accepted", "rejected", "resolved"]).optional(),
  assignedReviewerId: z.string().uuid().nullable().optional(),
  comment: z.string().trim().max(4000).optional(),
});

export const createMayoRuleSchema = z.object({
  caseId: z.string().uuid().optional(),
  familyId: z.string().uuid(),
  code: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[A-Z0-9_]+$/),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().min(2).max(2000),
  kind: z.enum(["deterministic", "semantic"]),
  severity: mayoSeveritySchema,
  enabled: z.boolean().default(true),
  config: z
    .object({
      toleranceUsd: z.number().nonnegative().optional(),
      tolerancePct: z.number().nonnegative().optional(),
      expectedRetainagePct: z.number().nonnegative().optional(),
      minimumConfidence: z.number().min(0).max(1).optional(),
      instructions: z.string().max(4000).optional(),
    })
    .default({}),
});

export const createMayoRuleFamilySchema = z.object({
  caseId: z.string().uuid().optional(),
  code: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[A-Z0-9_]+$/),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional(),
});

export const runMayoReviewSchema = z.object({
  documentIds: z.array(z.string().uuid()).optional(),
});

export const compareMayoDocumentsSchema = z.object({
  draftDocumentId: z.string().uuid(),
  finalDocumentId: z.string().uuid(),
});

export const syncMayoEbuilderSchema = z
  .object({
    commitmentInvoiceId: z.string().trim().optional(),
    invoiceNumber: z.string().trim().optional(),
    commitmentNumber: z.string().trim().optional(),
    commitmentId: z.string().trim().optional(),
    projectSearchTerm: z.string().trim().optional(),
  })
  .refine(
    (value) =>
      Boolean(
        value.commitmentInvoiceId || value.invoiceNumber || value.commitmentId
      ),
    {
      message: "Provide commitmentInvoiceId, invoiceNumber, or commitmentId",
    }
  );

export const mayoCaseIdSchema = z.string().uuid();

export const mayoAuditQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
});
