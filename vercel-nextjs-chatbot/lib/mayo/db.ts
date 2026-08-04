import "server-only";

import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  type MayoAuditEvent,
  type MayoCase,
  type MayoCaseMember,
  type MayoDocument,
  type MayoDocumentExtraction,
  type MayoDraftComparison,
  type MayoFinding,
  type MayoFindingEvidence,
  type MayoIntegrationSync,
  type MayoReviewerDecision,
  type MayoReviewRun,
  type MayoRule,
  type MayoRuleFamily,
  mayoAuditEvent,
  mayoCase,
  mayoCaseMember,
  mayoDocument,
  mayoDocumentExtraction,
  mayoDraftComparison,
  mayoFinding,
  mayoFindingEvidence,
  mayoIntegrationSync,
  mayoReviewerDecision,
  mayoReviewRun,
  mayoRule,
  mayoRuleFamily,
} from "@/lib/db/schema";
import type {
  MayoCandidateFinding,
  MayoComparisonOutput,
  MayoDocumentCategory,
  MayoDocumentExtractionData,
  MayoDocumentStage,
  MayoNormalizedRule,
  MayoRuleConfig,
  MayoUsage,
} from "./types";
import { assertMayoFindingTransition } from "./workflow";

let drizzleDb: ReturnType<typeof getDb> | undefined;

function useDb() {
  if (!drizzleDb) {
    drizzleDb = getDb();
  }
  return drizzleDb;
}

const DEFAULT_RULES: Array<{
  code: string;
  name: string;
  description: string;
  kind: "deterministic" | "semantic";
  severity: "info" | "low" | "medium" | "high" | "critical";
  config: MayoRuleConfig;
}> = [
  {
    code: "MATH",
    name: "Arithmetic reconciliation",
    description:
      "Reconcile payment totals with schedule-of-values line amounts.",
    kind: "deterministic",
    severity: "high",
    config: { toleranceUsd: 100 },
  },
  {
    code: "OVER_BILLING",
    name: "Over-billing",
    description:
      "Identify schedule lines billed above their scheduled or adjusted value.",
    kind: "deterministic",
    severity: "critical",
    config: { toleranceUsd: 1 },
  },
  {
    code: "RETAINAGE",
    name: "Retainage",
    description:
      "Reconcile withheld retainage with the stated contract percentage.",
    kind: "deterministic",
    severity: "high",
    config: { tolerancePct: 0.0025 },
  },
  {
    code: "CO_UNAPPROVED",
    name: "Unapproved change billing",
    description:
      "Identify amounts billed against pending or unapproved changes.",
    kind: "deterministic",
    severity: "high",
    config: {},
  },
  {
    code: "LARGE_PERIOD",
    name: "Unusually large period",
    description:
      "Compare the current payment with the average of prior payments.",
    kind: "deterministic",
    severity: "medium",
    config: { tolerancePct: 0.2 },
  },
  {
    code: "DUPLICATE",
    name: "Potential duplicate billing",
    description:
      "Compare descriptions, amounts, and prior submissions for duplicate work.",
    kind: "semantic",
    severity: "high",
    config: { minimumConfidence: 0.7 },
  },
  {
    code: "CONTRACT_SCOPE",
    name: "Contract scope",
    description:
      "Verify that invoiced work is supported by the contract or an approved change.",
    kind: "semantic",
    severity: "high",
    config: { minimumConfidence: 0.7 },
  },
  {
    code: "SUPPORTING_DOCS",
    name: "Supporting documents",
    description:
      "Verify that the submission includes documentation required by the contract.",
    kind: "semantic",
    severity: "medium",
    config: { minimumConfidence: 0.65 },
  },
  {
    code: "PRIOR_PERIOD",
    name: "Prior-period consistency",
    description:
      "Find inconsistent amounts, descriptions, or status across payment periods.",
    kind: "semantic",
    severity: "medium",
    config: { minimumConfidence: 0.7 },
  },
];

export async function appendMayoAuditEvent(input: {
  caseId: string;
  actorUserId?: string | null;
  eventType: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<MayoAuditEvent> {
  const [event] = await useDb()
    .insert(mayoAuditEvent)
    .values({
      caseId: input.caseId,
      actorUserId: input.actorUserId ?? null,
      eventType: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? {},
    })
    .returning();

  return event;
}

export async function createMayoCaseRecord(input: {
  ownerUserId: string;
  name: string;
  projectName: string;
  projectNumber?: string;
  description?: string;
}): Promise<MayoCase> {
  const created = await useDb().transaction(async (tx) => {
    const [record] = await tx
      .insert(mayoCase)
      .values({
        ownerUserId: input.ownerUserId,
        name: input.name,
        projectName: input.projectName,
        projectNumber: input.projectNumber ?? null,
        description: input.description ?? null,
      })
      .returning();

    await tx.insert(mayoCaseMember).values({
      caseId: record.id,
      userId: input.ownerUserId,
      role: "owner",
      scopes: {},
    });

    await tx.insert(mayoAuditEvent).values({
      caseId: record.id,
      actorUserId: input.ownerUserId,
      eventType: "case.created",
      entityType: "case",
      entityId: record.id,
      metadata: {
        name: record.name,
        projectName: record.projectName,
      },
    });

    return record;
  });

  await ensureDefaultMayoRules(input.ownerUserId);
  return created;
}

export async function listMayoCasesForUser(
  userId: string
): Promise<Array<{ case: MayoCase; membership: MayoCaseMember }>> {
  const rows = await useDb()
    .select({
      case: mayoCase,
      membership: mayoCaseMember,
    })
    .from(mayoCaseMember)
    .innerJoin(mayoCase, eq(mayoCaseMember.caseId, mayoCase.id))
    .where(eq(mayoCaseMember.userId, userId))
    .orderBy(desc(mayoCase.updatedAt));

  return rows;
}

export async function getMayoCaseForUser(input: {
  caseId: string;
  userId: string;
}): Promise<{ case: MayoCase; membership: MayoCaseMember } | null> {
  const [row] = await useDb()
    .select({
      case: mayoCase,
      membership: mayoCaseMember,
    })
    .from(mayoCaseMember)
    .innerJoin(mayoCase, eq(mayoCaseMember.caseId, mayoCase.id))
    .where(
      and(
        eq(mayoCaseMember.caseId, input.caseId),
        eq(mayoCaseMember.userId, input.userId)
      )
    )
    .limit(1);

  return row ?? null;
}

export async function getMayoCaseById(
  caseId: string
): Promise<MayoCase | null> {
  const [record] = await useDb()
    .select()
    .from(mayoCase)
    .where(eq(mayoCase.id, caseId))
    .limit(1);
  return record ?? null;
}

export async function claimMayoCaseVectorStore(input: {
  caseId: string;
  vectorStoreId: string;
}): Promise<boolean> {
  const [claimed] = await useDb()
    .update(mayoCase)
    .set({
      openaiVectorStoreId: input.vectorStoreId,
      updatedAt: new Date(),
    })
    .where(
      and(eq(mayoCase.id, input.caseId), isNull(mayoCase.openaiVectorStoreId))
    )
    .returning({ id: mayoCase.id });
  return Boolean(claimed);
}

export async function updateMayoCaseStatus(input: {
  caseId: string;
  status: "active" | "in_review" | "completed" | "archived";
}): Promise<void> {
  await useDb()
    .update(mayoCase)
    .set({ status: input.status, updatedAt: new Date() })
    .where(eq(mayoCase.id, input.caseId));
}

export async function deleteMayoCaseRecord(caseId: string): Promise<void> {
  await useDb().delete(mayoCase).where(eq(mayoCase.id, caseId));
}

export async function createMayoDocumentRecord(input: {
  id: string;
  caseId: string;
  userId: string;
  category: MayoDocumentCategory;
  stage: MayoDocumentStage;
  revision: number;
  paymentApplicationNumber?: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  bucket: string;
  objectPath: string;
}): Promise<MayoDocument> {
  const [document] = await useDb()
    .insert(mayoDocument)
    .values({
      id: input.id,
      caseId: input.caseId,
      uploadedByUserId: input.userId,
      category: input.category,
      stage: input.stage,
      revision: input.revision,
      paymentApplicationNumber: input.paymentApplicationNumber ?? null,
      originalFilename: input.filename,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      bucket: input.bucket,
      objectPath: input.objectPath,
      status: "uploading",
    })
    .returning();

  await appendMayoAuditEvent({
    caseId: input.caseId,
    actorUserId: input.userId,
    eventType: "document.upload_started",
    entityType: "document",
    entityId: document.id,
    metadata: {
      filename: document.originalFilename,
      category: document.category,
      sizeBytes: document.sizeBytes,
    },
  });

  return document;
}

export async function getMayoDocumentById(
  documentId: string
): Promise<MayoDocument | null> {
  const [document] = await useDb()
    .select()
    .from(mayoDocument)
    .where(eq(mayoDocument.id, documentId))
    .limit(1);
  return document ?? null;
}

export async function findMayoDocumentByChecksum(input: {
  caseId: string;
  checksumSha256: string;
  excludeDocumentId?: string;
}): Promise<MayoDocument | null> {
  const [document] = await useDb()
    .select()
    .from(mayoDocument)
    .where(
      and(
        eq(mayoDocument.caseId, input.caseId),
        eq(mayoDocument.checksumSha256, input.checksumSha256),
        input.excludeDocumentId
          ? sql`${mayoDocument.id} <> ${input.excludeDocumentId}`
          : sql`true`,
        sql`${mayoDocument.status} <> 'deleted'`
      )
    )
    .limit(1);
  return document ?? null;
}

export function listMayoDocuments(caseId: string): Promise<MayoDocument[]> {
  return useDb()
    .select()
    .from(mayoDocument)
    .where(
      and(
        eq(mayoDocument.caseId, caseId),
        sql`${mayoDocument.status} <> 'deleted'`
      )
    )
    .orderBy(desc(mayoDocument.uploadedAt));
}

export async function completeMayoDocumentUpload(input: {
  documentId: string;
  checksumSha256: string;
  sizeBytes: number;
}): Promise<MayoDocument> {
  const [document] = await useDb()
    .update(mayoDocument)
    .set({
      checksumSha256: input.checksumSha256,
      sizeBytes: input.sizeBytes,
      status: "uploaded",
      indexingError: null,
    })
    .where(eq(mayoDocument.id, input.documentId))
    .returning();
  return document;
}

export async function claimMayoDocumentIndexing(
  documentId: string
): Promise<MayoDocument | null> {
  const [document] = await useDb()
    .update(mayoDocument)
    .set({
      status: "indexing",
      indexingError: null,
    })
    .where(
      and(
        eq(mayoDocument.id, documentId),
        inArray(mayoDocument.status, ["uploaded", "failed"])
      )
    )
    .returning();
  return document ?? null;
}

export async function updateMayoDocumentIndexing(input: {
  documentId: string;
  status: "uploaded" | "indexing" | "ready" | "failed" | "deleted";
  openaiFileId?: string | null;
  vectorStoreFileId?: string | null;
  errorMessage?: string | null;
}): Promise<MayoDocument> {
  const [document] = await useDb()
    .update(mayoDocument)
    .set({
      status: input.status,
      ...(input.openaiFileId !== undefined && {
        openaiFileId: input.openaiFileId,
      }),
      ...(input.vectorStoreFileId !== undefined && {
        openaiVectorStoreFileId: input.vectorStoreFileId,
      }),
      indexingError: input.errorMessage ?? null,
      indexedAt: input.status === "ready" ? new Date() : null,
      deletedAt: input.status === "deleted" ? new Date() : null,
    })
    .where(eq(mayoDocument.id, input.documentId))
    .returning();
  return document;
}

export async function upsertMayoExtractionPending(input: {
  caseId: string;
  documentId: string;
  model: string;
  promptVersion: string;
}): Promise<MayoDocumentExtraction> {
  const [extraction] = await useDb()
    .insert(mayoDocumentExtraction)
    .values({
      caseId: input.caseId,
      documentId: input.documentId,
      model: input.model,
      promptVersion: input.promptVersion,
      status: "pending",
    })
    .onConflictDoUpdate({
      target: mayoDocumentExtraction.documentId,
      set: {
        model: input.model,
        promptVersion: input.promptVersion,
        status: "pending",
        errorMessage: null,
        updatedAt: new Date(),
      },
    })
    .returning();
  return extraction;
}

export async function updateMayoExtraction(input: {
  documentId: string;
  status: "processing" | "completed" | "needs_review" | "failed";
  responseId?: string | null;
  data?: MayoDocumentExtractionData | null;
  usage?: MayoUsage | null;
  errorMessage?: string | null;
}): Promise<MayoDocumentExtraction> {
  const [extraction] = await useDb()
    .update(mayoDocumentExtraction)
    .set({
      status: input.status,
      ...(input.responseId !== undefined && {
        openaiResponseId: input.responseId,
      }),
      ...(input.data !== undefined && {
        data: input.data,
        confidence:
          input.data === null ? null : Math.round(input.data.confidence * 100),
        missingFields: input.data?.missingFields ?? [],
      }),
      ...(input.usage !== undefined && { usage: input.usage }),
      errorMessage: input.errorMessage ?? null,
      updatedAt: new Date(),
    })
    .where(eq(mayoDocumentExtraction.documentId, input.documentId))
    .returning();
  return extraction;
}

export function listMayoExtractions(
  caseId: string
): Promise<MayoDocumentExtraction[]> {
  return useDb()
    .select()
    .from(mayoDocumentExtraction)
    .where(eq(mayoDocumentExtraction.caseId, caseId))
    .orderBy(desc(mayoDocumentExtraction.updatedAt));
}

export async function ensureDefaultMayoRules(userId: string): Promise<void> {
  await useDb().transaction(async (tx) => {
    await tx
      .insert(mayoRuleFamily)
      .values({
        ownerUserId: userId,
        code: "PAYMENT_REVIEW",
        name: "Payment review",
        description:
          "Default deterministic and semantic controls for Mayo payment review.",
      })
      .onConflictDoNothing({
        target: [mayoRuleFamily.ownerUserId, mayoRuleFamily.code],
      });

    const [family] = await tx
      .select()
      .from(mayoRuleFamily)
      .where(
        and(
          eq(mayoRuleFamily.ownerUserId, userId),
          eq(mayoRuleFamily.code, "PAYMENT_REVIEW")
        )
      )
      .limit(1);

    if (!family) {
      throw new Error("Unable to initialize Mayo rule family");
    }

    for (const rule of DEFAULT_RULES) {
      await tx
        .insert(mayoRule)
        .values({
          familyId: family.id,
          createdByUserId: userId,
          code: rule.code,
          name: rule.name,
          description: rule.description,
          kind: rule.kind,
          severity: rule.severity,
          enabled: true,
          config: rule.config,
          version: 1,
        })
        .onConflictDoNothing({
          target: [mayoRule.familyId, mayoRule.code, mayoRule.version],
        });
    }
  });
}

export async function listMayoRuleFamilies(
  userId: string
): Promise<MayoRuleFamily[]> {
  await ensureDefaultMayoRules(userId);
  return useDb()
    .select()
    .from(mayoRuleFamily)
    .where(eq(mayoRuleFamily.ownerUserId, userId))
    .orderBy(mayoRuleFamily.name);
}

export async function listLatestMayoRules(
  userId: string
): Promise<MayoNormalizedRule[]> {
  await ensureDefaultMayoRules(userId);
  const rows = await useDb()
    .select({
      rule: mayoRule,
      family: mayoRuleFamily,
    })
    .from(mayoRule)
    .innerJoin(mayoRuleFamily, eq(mayoRule.familyId, mayoRuleFamily.id))
    .where(
      and(
        eq(mayoRuleFamily.ownerUserId, userId),
        eq(mayoRuleFamily.enabled, true),
        eq(mayoRule.enabled, true)
      )
    )
    .orderBy(desc(mayoRule.version));

  const latest = new Map<string, MayoNormalizedRule>();
  for (const row of rows) {
    const key = `${row.rule.familyId}:${row.rule.code}`;
    if (latest.has(key)) {
      continue;
    }
    latest.set(key, {
      id: row.rule.id,
      familyId: row.rule.familyId,
      code: row.rule.code,
      name: row.rule.name,
      description: row.rule.description,
      kind: row.rule.kind,
      severity: row.rule.severity,
      config: row.rule.config ?? {},
      version: row.rule.version,
    });
  }

  return [...latest.values()];
}

export async function createMayoRuleFamilyRecord(input: {
  ownerUserId: string;
  code: string;
  name: string;
  description?: string;
}): Promise<MayoRuleFamily> {
  const [family] = await useDb()
    .insert(mayoRuleFamily)
    .values({
      ownerUserId: input.ownerUserId,
      code: input.code,
      name: input.name,
      description: input.description ?? null,
    })
    .returning();
  return family;
}

export async function createMayoRuleVersion(input: {
  ownerUserId: string;
  createdByUserId: string;
  familyId: string;
  code: string;
  name: string;
  description: string;
  kind: "deterministic" | "semantic";
  severity: "info" | "low" | "medium" | "high" | "critical";
  enabled: boolean;
  config: MayoRuleConfig;
}): Promise<MayoRule> {
  const [ownedFamily] = await useDb()
    .select()
    .from(mayoRuleFamily)
    .where(
      and(
        eq(mayoRuleFamily.id, input.familyId),
        eq(mayoRuleFamily.ownerUserId, input.ownerUserId)
      )
    )
    .limit(1);
  if (!ownedFamily) {
    throw new Error("Rule family not found");
  }

  const [latest] = await useDb()
    .select()
    .from(mayoRule)
    .where(
      and(eq(mayoRule.familyId, input.familyId), eq(mayoRule.code, input.code))
    )
    .orderBy(desc(mayoRule.version))
    .limit(1);

  const [rule] = await useDb()
    .insert(mayoRule)
    .values({
      familyId: input.familyId,
      createdByUserId: input.createdByUserId,
      code: input.code,
      name: input.name,
      description: input.description,
      kind: input.kind,
      severity: input.severity,
      enabled: input.enabled,
      config: input.config,
      version: (latest?.version ?? 0) + 1,
    })
    .returning();
  return rule;
}

export async function createMayoReviewRunRecord(input: {
  caseId: string;
  userId: string;
  model: string;
  promptVersion: string;
  rules: MayoNormalizedRule[];
  documentIds: string[];
}): Promise<MayoReviewRun> {
  const [run] = await useDb()
    .insert(mayoReviewRun)
    .values({
      caseId: input.caseId,
      requestedByUserId: input.userId,
      model: input.model,
      promptVersion: input.promptVersion,
      ruleSnapshot: input.rules,
      sourceDocumentIds: input.documentIds,
      status: "queued",
    })
    .returning();
  return run;
}

export async function updateMayoReviewRun(input: {
  runId: string;
  status: "running" | "awaiting_review" | "completed" | "failed";
  responseId?: string | null;
  retrievalResults?: unknown[];
  usage?: MayoUsage | null;
  summary?: string | null;
  errorMessage?: string | null;
}): Promise<MayoReviewRun> {
  const now = new Date();
  const [run] = await useDb()
    .update(mayoReviewRun)
    .set({
      status: input.status,
      ...(input.responseId !== undefined && {
        openaiResponseId: input.responseId,
      }),
      ...(input.retrievalResults !== undefined && {
        retrievalResults: input.retrievalResults,
      }),
      ...(input.usage !== undefined && { usage: input.usage }),
      ...(input.summary !== undefined && { summary: input.summary }),
      errorMessage: input.errorMessage ?? null,
      ...(input.status === "running" && { startedAt: now }),
      ...(["awaiting_review", "completed", "failed"].includes(input.status) && {
        completedAt: now,
      }),
    })
    .where(eq(mayoReviewRun.id, input.runId))
    .returning();
  return run;
}

export function listMayoReviewRuns(caseId: string): Promise<MayoReviewRun[]> {
  return useDb()
    .select()
    .from(mayoReviewRun)
    .where(eq(mayoReviewRun.caseId, caseId))
    .orderBy(desc(mayoReviewRun.createdAt));
}

export async function getMayoReviewRunById(
  runId: string
): Promise<MayoReviewRun | null> {
  const [run] = await useDb()
    .select()
    .from(mayoReviewRun)
    .where(eq(mayoReviewRun.id, runId))
    .limit(1);
  return run ?? null;
}

export function saveMayoFindings(input: {
  caseId: string;
  reviewRunId: string;
  findings: Array<
    MayoCandidateFinding & {
      fingerprint: string;
    }
  >;
  documents: MayoDocument[];
}): Promise<MayoFinding[]> {
  const documentByOpenAiId = new Map(
    input.documents
      .filter((document) => document.openaiFileId)
      .map((document) => [document.openaiFileId as string, document])
  );
  const documentByFilename = new Map(
    input.documents.map((document) => [
      document.originalFilename.toLowerCase(),
      document,
    ])
  );

  return useDb().transaction(async (tx) => {
    const saved: MayoFinding[] = [];

    for (const candidate of input.findings) {
      const [finding] = await tx
        .insert(mayoFinding)
        .values({
          caseId: input.caseId,
          reviewRunId: input.reviewRunId,
          ruleId: candidate.ruleId,
          fingerprint: candidate.fingerprint,
          ruleCode: candidate.ruleCode,
          title: candidate.title,
          description: candidate.description,
          severity: candidate.severity,
          amountImpact:
            candidate.amountImpact === null
              ? null
              : candidate.amountImpact.toFixed(2),
          confidence: Math.round(candidate.confidence * 100),
          source: candidate.source,
          recommendation: candidate.recommendation,
        })
        .onConflictDoUpdate({
          target: [mayoFinding.caseId, mayoFinding.fingerprint],
          set: {
            reviewRunId: input.reviewRunId,
            ruleId: candidate.ruleId,
            description: candidate.description,
            severity: candidate.severity,
            amountImpact:
              candidate.amountImpact === null
                ? null
                : candidate.amountImpact.toFixed(2),
            confidence: Math.round(candidate.confidence * 100),
            source: candidate.source,
            recommendation: candidate.recommendation,
            updatedAt: new Date(),
          },
        })
        .returning();

      await tx
        .delete(mayoFindingEvidence)
        .where(eq(mayoFindingEvidence.findingId, finding.id));

      if (candidate.evidence.length > 0) {
        await tx.insert(mayoFindingEvidence).values(
          candidate.evidence.map((evidence) => {
            const sourceDocument =
              (evidence.openaiFileId
                ? documentByOpenAiId.get(evidence.openaiFileId)
                : undefined) ??
              documentByFilename.get(evidence.filename.toLowerCase());
            return {
              findingId: finding.id,
              documentId: evidence.documentId ?? sourceDocument?.id ?? null,
              openaiFileId:
                evidence.openaiFileId ?? sourceDocument?.openaiFileId ?? null,
              filename: evidence.filename,
              excerpt: evidence.excerpt,
              pageNumber: evidence.pageNumber,
              pageNumberVerified: false,
              coordinates: null,
              relevanceScore: evidence.confidence.toFixed(5),
            };
          })
        );
      }
      saved.push(finding);
    }

    return saved;
  });
}

export type MayoFindingWithEvidence = MayoFinding & {
  ruleFamilyId: string | null;
  evidence: MayoFindingEvidence[];
  decisions: MayoReviewerDecision[];
};

export async function listMayoFindings(
  caseId: string
): Promise<MayoFindingWithEvidence[]> {
  const database = useDb();
  const findings = await database
    .select()
    .from(mayoFinding)
    .where(eq(mayoFinding.caseId, caseId))
    .orderBy(desc(mayoFinding.createdAt));

  if (findings.length === 0) {
    return [];
  }

  const findingIds = findings.map((finding) => finding.id);
  const ruleIds = findings
    .map((finding) => finding.ruleId)
    .filter((ruleId): ruleId is string => Boolean(ruleId));
  const [evidence, decisions, rules] = await Promise.all([
    database
      .select()
      .from(mayoFindingEvidence)
      .where(inArray(mayoFindingEvidence.findingId, findingIds)),
    database
      .select()
      .from(mayoReviewerDecision)
      .where(inArray(mayoReviewerDecision.findingId, findingIds))
      .orderBy(desc(mayoReviewerDecision.createdAt)),
    ruleIds.length > 0
      ? database
          .select({ id: mayoRule.id, familyId: mayoRule.familyId })
          .from(mayoRule)
          .where(inArray(mayoRule.id, ruleIds))
      : Promise.resolve([]),
  ]);
  const familyByRuleId = new Map(rules.map((rule) => [rule.id, rule.familyId]));

  return findings.map((finding) => ({
    ...finding,
    ruleFamilyId: finding.ruleId
      ? (familyByRuleId.get(finding.ruleId) ?? null)
      : null,
    evidence: evidence.filter((item) => item.findingId === finding.id),
    decisions: decisions.filter(
      (decision) => decision.findingId === finding.id
    ),
  }));
}

export async function getMayoFindingForCase(input: {
  findingId: string;
  caseId: string;
}): Promise<MayoFinding | null> {
  const [finding] = await useDb()
    .select()
    .from(mayoFinding)
    .where(
      and(
        eq(mayoFinding.id, input.findingId),
        eq(mayoFinding.caseId, input.caseId)
      )
    )
    .limit(1);
  return finding ?? null;
}

export function updateMayoFindingDecision(input: {
  findingId: string;
  userId: string;
  status?: "open" | "accepted" | "rejected" | "resolved";
  assignedReviewerId?: string | null;
  comment?: string;
}): Promise<MayoFinding> {
  return useDb().transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(mayoFinding)
      .where(eq(mayoFinding.id, input.findingId))
      .limit(1);
    if (!current) {
      throw new Error("Finding not found");
    }
    if (input.status !== undefined) {
      assertMayoFindingTransition(current.status, input.status);
    }

    const [updated] = await tx
      .update(mayoFinding)
      .set({
        ...(input.status !== undefined && { status: input.status }),
        ...(input.assignedReviewerId !== undefined && {
          assignedReviewerId: input.assignedReviewerId,
        }),
        updatedAt: new Date(),
      })
      .where(eq(mayoFinding.id, input.findingId))
      .returning();

    let decision:
      | "accepted"
      | "rejected"
      | "resolved"
      | "commented"
      | "reopened"
      | "assigned" = "commented";

    if (input.status === "accepted") {
      decision = "accepted";
    } else if (input.status === "rejected") {
      decision = "rejected";
    } else if (input.status === "resolved") {
      decision = "resolved";
    } else if (input.status === "open" && current.status !== "open") {
      decision = "reopened";
    } else if (input.assignedReviewerId !== undefined) {
      decision = "assigned";
    }

    await tx.insert(mayoReviewerDecision).values({
      findingId: input.findingId,
      userId: input.userId,
      decision,
      comment: input.comment ?? null,
    });

    return updated;
  });
}

export async function createMayoComparisonRecord(input: {
  caseId: string;
  userId: string;
  draftDocumentId: string;
  finalDocumentId: string;
  model: string;
  promptVersion: string;
}): Promise<MayoDraftComparison> {
  const [comparison] = await useDb()
    .insert(mayoDraftComparison)
    .values({
      caseId: input.caseId,
      createdByUserId: input.userId,
      draftDocumentId: input.draftDocumentId,
      finalDocumentId: input.finalDocumentId,
      model: input.model,
      promptVersion: input.promptVersion,
      status: "queued",
    })
    .returning();
  return comparison;
}

export async function updateMayoComparison(input: {
  comparisonId: string;
  status: "running" | "completed" | "failed";
  responseId?: string | null;
  usage?: MayoUsage | null;
  summary?: string | null;
  data?: MayoComparisonOutput | null;
  errorMessage?: string | null;
}): Promise<MayoDraftComparison> {
  const [comparison] = await useDb()
    .update(mayoDraftComparison)
    .set({
      status: input.status,
      ...(input.responseId !== undefined && {
        openaiResponseId: input.responseId,
      }),
      ...(input.usage !== undefined && { usage: input.usage }),
      ...(input.summary !== undefined && { summary: input.summary }),
      ...(input.data !== undefined && { data: input.data }),
      errorMessage: input.errorMessage ?? null,
      ...(["completed", "failed"].includes(input.status) && {
        completedAt: new Date(),
      }),
    })
    .where(eq(mayoDraftComparison.id, input.comparisonId))
    .returning();
  return comparison;
}

export function listMayoComparisons(
  caseId: string
): Promise<MayoDraftComparison[]> {
  return useDb()
    .select()
    .from(mayoDraftComparison)
    .where(eq(mayoDraftComparison.caseId, caseId))
    .orderBy(desc(mayoDraftComparison.createdAt));
}

export async function getMayoComparisonById(
  comparisonId: string
): Promise<MayoDraftComparison | null> {
  const [comparison] = await useDb()
    .select()
    .from(mayoDraftComparison)
    .where(eq(mayoDraftComparison.id, comparisonId))
    .limit(1);
  return comparison ?? null;
}

export async function createMayoIntegrationSyncRecord(input: {
  caseId: string;
  userId: string;
  request: Record<string, unknown>;
}): Promise<MayoIntegrationSync> {
  const [sync] = await useDb()
    .insert(mayoIntegrationSync)
    .values({
      caseId: input.caseId,
      requestedByUserId: input.userId,
      request: input.request,
      status: "queued",
    })
    .returning();
  return sync;
}

export async function updateMayoIntegrationSync(input: {
  syncId: string;
  status: "running" | "completed" | "failed";
  result?: unknown;
  errorMessage?: string | null;
}): Promise<MayoIntegrationSync> {
  const [sync] = await useDb()
    .update(mayoIntegrationSync)
    .set({
      status: input.status,
      ...(input.result !== undefined && { result: input.result }),
      errorMessage: input.errorMessage ?? null,
      ...(["completed", "failed"].includes(input.status) && {
        completedAt: new Date(),
      }),
    })
    .where(eq(mayoIntegrationSync.id, input.syncId))
    .returning();
  return sync;
}

export function listMayoIntegrationSyncs(
  caseId: string
): Promise<MayoIntegrationSync[]> {
  return useDb()
    .select()
    .from(mayoIntegrationSync)
    .where(eq(mayoIntegrationSync.caseId, caseId))
    .orderBy(desc(mayoIntegrationSync.createdAt));
}

export async function getMayoIntegrationSyncById(
  syncId: string
): Promise<MayoIntegrationSync | null> {
  const [syncRecord] = await useDb()
    .select()
    .from(mayoIntegrationSync)
    .where(eq(mayoIntegrationSync.id, syncId))
    .limit(1);
  return syncRecord ?? null;
}

export function listMayoAuditEvents(input: {
  caseId: string;
  limit: number;
}): Promise<MayoAuditEvent[]> {
  return useDb()
    .select()
    .from(mayoAuditEvent)
    .where(eq(mayoAuditEvent.caseId, input.caseId))
    .orderBy(desc(mayoAuditEvent.createdAt))
    .limit(input.limit);
}
