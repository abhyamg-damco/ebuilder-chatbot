import { z } from "zod";

export const mayoDocumentCategorySchema = z.enum([
  "contract",
  "amendment",
  "pay_application",
  "invoice",
  "change_order",
  "prior_payment",
  "supporting_document",
  "ebuilder_export",
  "other",
]);

export type MayoDocumentCategory = z.infer<typeof mayoDocumentCategorySchema>;

export const mayoDocumentStageSchema = z.enum(["draft", "final", "supporting"]);

export type MayoDocumentStage = z.infer<typeof mayoDocumentStageSchema>;

export const mayoSeveritySchema = z.enum([
  "info",
  "low",
  "medium",
  "high",
  "critical",
]);

export type MayoSeverity = z.infer<typeof mayoSeveritySchema>;

export const mayoEvidenceSchema = z
  .object({
    documentId: z.string().nullable(),
    openaiFileId: z.string().nullable(),
    filename: z.string(),
    excerpt: z.string(),
    pageNumber: z.number().int().positive().nullable(),
    confidence: z.number().min(0).max(1),
  })
  .strict();

export type MayoEvidence = z.infer<typeof mayoEvidenceSchema>;

export const mayoLineItemSchema = z
  .object({
    lineNumber: z.string().nullable(),
    description: z.string(),
    scheduledValue: z.number().nullable(),
    previousApplications: z.number().nullable(),
    currentApplication: z.number().nullable(),
    storedMaterials: z.number().nullable(),
    totalCompleted: z.number().nullable(),
    percentComplete: z.number().nullable(),
    balanceToFinish: z.number().nullable(),
    retainage: z.number().nullable(),
    sourceExcerpt: z.string(),
    pageNumber: z.number().int().positive().nullable(),
    confidence: z.number().min(0).max(1),
  })
  .strict();

/**
 * Classification is asked for on its own rather than as one field of the full
 * extraction. Measured against the same documents, the type is reliable in
 * isolation and unreliable when it competes with thirty other fields.
 */
export const mayoDocumentClassificationSchema = z
  .object({ documentType: mayoDocumentCategorySchema })
  .strict();

export const mayoDocumentExtractionSchema = z
  .object({
    documentType: mayoDocumentCategorySchema,
    invoiceNumber: z.string().nullable(),
    applicationNumber: z.string().nullable(),
    vendor: z.string().nullable(),
    projectName: z.string().nullable(),
    projectNumber: z.string().nullable(),
    commitmentNumber: z.string().nullable(),
    periodStart: z.string().nullable(),
    periodEnd: z.string().nullable(),
    contractValue: z.number().nullable(),
    approvedChangeOrders: z.number().nullable(),
    pendingChangeOrders: z.number().nullable(),
    billedAgainstPendingChangeOrders: z.number().nullable(),
    previousPayments: z.number().nullable(),
    currentPayment: z.number().nullable(),
    totalCompletedAndStored: z.number().nullable(),
    retainageAmount: z.number().nullable(),
    retainagePercent: z.number().nullable(),
    balanceToFinish: z.number().nullable(),
    approvalStatus: z.string().nullable(),
    lineItems: z.array(mayoLineItemSchema),
    evidence: z.array(mayoEvidenceSchema),
    missingFields: z.array(z.string()),
    confidence: z.number().min(0).max(1),
    reviewerNotes: z.array(z.string()),
  })
  .strict();

export type MayoDocumentExtractionData = z.infer<
  typeof mayoDocumentExtractionSchema
>;

export const mayoSemanticFindingSchema = z
  .object({
    ruleCode: z.string(),
    title: z.string(),
    description: z.string(),
    severity: mayoSeveritySchema,
    amountImpact: z.number().nullable(),
    confidence: z.number().min(0).max(1),
    evidence: z.array(mayoEvidenceSchema).min(1),
    recommendation: z.string(),
  })
  .strict();

export const mayoReviewOutputSchema = z
  .object({
    summary: z.string(),
    riskRating: z.enum(["low", "medium", "high", "critical"]),
    findings: z.array(mayoSemanticFindingSchema),
    passedChecks: z.array(
      z
        .object({
          ruleCode: z.string(),
          message: z.string(),
        })
        .strict()
    ),
    reviewerQuestions: z.array(z.string()),
  })
  .strict();

export type MayoReviewOutput = z.infer<typeof mayoReviewOutputSchema>;

export const mayoComparisonOutputSchema = z
  .object({
    summary: z.string(),
    resolvedFindingFingerprints: z.array(z.string()),
    unchangedFindingFingerprints: z.array(z.string()),
    changedFindings: z.array(
      z
        .object({
          findingFingerprint: z.string(),
          explanation: z.string(),
          amountBefore: z.number().nullable(),
          amountAfter: z.number().nullable(),
          evidence: z.array(mayoEvidenceSchema),
        })
        .strict()
    ),
    newFindings: z.array(mayoSemanticFindingSchema),
  })
  .strict();

export type MayoComparisonOutput = z.infer<typeof mayoComparisonOutputSchema>;

export type MayoRuleConfig = {
  toleranceUsd?: number;
  tolerancePct?: number;
  expectedRetainagePct?: number;
  minimumConfidence?: number;
  instructions?: string;
};

export type MayoNormalizedRule = {
  id: string | null;
  familyId: string;
  code: string;
  name: string;
  description: string;
  kind: "deterministic" | "semantic";
  severity: MayoSeverity;
  config: MayoRuleConfig;
  version: number;
};

export type MayoCandidateFinding = {
  ruleId: string | null;
  ruleCode: string;
  title: string;
  description: string;
  severity: MayoSeverity;
  amountImpact: number | null;
  confidence: number;
  source: "deterministic" | "semantic" | "comparison";
  recommendation: string;
  evidence: MayoEvidence[];
};

export type MayoUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  /**
   * Reasoning tokens are billed as output but are invisible in the response
   * text, and the resolved model can differ from the configured one when the
   * configured value is an alias. Both are recorded so cost can be attributed.
   */
  reasoningTokens?: number | null;
  resolvedModel?: string | null;
};
