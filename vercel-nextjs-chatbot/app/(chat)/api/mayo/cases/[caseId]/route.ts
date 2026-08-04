import { after, NextResponse } from "next/server";
import {
  authorizeMayoCase,
  canAccessMayoDocumentCategory,
  canAccessMayoRuleFamily,
} from "@/lib/mayo/auth";
import {
  deleteMayoCaseRecord,
  listLatestMayoRules,
  listMayoAuditEvents,
  listMayoComparisons,
  listMayoDocuments,
  listMayoExtractions,
  listMayoFindings,
  listMayoIntegrationSyncs,
  listMayoReviewRuns,
  listMayoRuleFamilies,
} from "@/lib/mayo/db";
import { deleteMayoOpenAIResources } from "@/lib/mayo/openai";
import { mayoCaseIdSchema } from "@/lib/mayo/schemas";
import { deleteMayoObject } from "@/lib/mayo/storage";

type RouteContext = {
  params: Promise<{ caseId: string }>;
};

export const maxDuration = 300;

export async function GET(_request: Request, context: RouteContext) {
  const { caseId: rawCaseId } = await context.params;
  const parsed = mayoCaseIdSchema.safeParse(rawCaseId);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid case ID" }, { status: 400 });
  }

  const authorization = await authorizeMayoCase(parsed.data);
  if (!authorization.authorized) {
    return authorization.response;
  }

  const rulesOwnerUserId = authorization.access.case.ownerUserId;
  const [
    documents,
    extractions,
    reviewRuns,
    findings,
    comparisons,
    integrationSyncs,
    auditEvents,
    ruleFamilies,
    rules,
  ] = await Promise.all([
    listMayoDocuments(parsed.data),
    listMayoExtractions(parsed.data),
    listMayoReviewRuns(parsed.data),
    listMayoFindings(parsed.data),
    listMayoComparisons(parsed.data),
    listMayoIntegrationSyncs(parsed.data),
    listMayoAuditEvents({ caseId: parsed.data, limit: 100 }),
    listMayoRuleFamilies(rulesOwnerUserId),
    listLatestMayoRules(rulesOwnerUserId),
  ]);
  const membership = authorization.access.membership;
  const scopedDocuments = documents.filter((document) =>
    canAccessMayoDocumentCategory(membership, document.category)
  );
  const documentIds = new Set(scopedDocuments.map((document) => document.id));
  const hasDocumentScope = Boolean(
    membership.scopes.documentCategories?.length
  );
  const scopedExtractions = extractions.filter((extraction) =>
    documentIds.has(extraction.documentId)
  );
  const scopedReviewRuns = reviewRuns.filter((run) =>
    run.sourceDocumentIds.every((documentId) => documentIds.has(documentId))
  );
  const reviewRunIds = new Set(scopedReviewRuns.map((run) => run.id));
  const scopedFindings = findings.filter(
    (finding) =>
      reviewRunIds.has(finding.reviewRunId) &&
      canAccessMayoRuleFamily(membership, finding.ruleFamilyId) &&
      (!hasDocumentScope ||
        finding.evidence.every(
          (evidence) =>
            evidence.documentId !== null && documentIds.has(evidence.documentId)
        ))
  );
  const findingIds = new Set(scopedFindings.map((finding) => finding.id));
  const scopedComparisons = comparisons.filter(
    (comparison) =>
      documentIds.has(comparison.draftDocumentId) &&
      documentIds.has(comparison.finalDocumentId)
  );
  const comparisonIds = new Set(
    scopedComparisons.map((comparison) => comparison.id)
  );
  const scopedIntegrationSyncs = canAccessMayoDocumentCategory(
    membership,
    "ebuilder_export"
  )
    ? integrationSyncs
    : [];
  const integrationSyncIds = new Set(
    scopedIntegrationSyncs.map((sync) => sync.id)
  );
  const scopedRuleFamilies = ruleFamilies.filter((family) =>
    canAccessMayoRuleFamily(membership, family.id)
  );
  const scopedRules = rules.filter((rule) =>
    canAccessMayoRuleFamily(membership, rule.familyId)
  );
  const scopedAuditEvents = auditEvents.filter((event) => {
    if (!event.entityId || event.entityType === "case") {
      return true;
    }
    if (event.entityType === "document") {
      return documentIds.has(event.entityId);
    }
    if (event.entityType === "finding") {
      return findingIds.has(event.entityId);
    }
    if (event.entityType === "review_run") {
      return reviewRunIds.has(event.entityId);
    }
    if (event.entityType === "draft_comparison") {
      return comparisonIds.has(event.entityId);
    }
    if (event.entityType === "integration_sync") {
      return integrationSyncIds.has(event.entityId);
    }
    return true;
  });

  return NextResponse.json({
    case: authorization.access.case,
    membership,
    documents: scopedDocuments,
    extractions: scopedExtractions,
    reviewRuns: scopedReviewRuns,
    findings: scopedFindings,
    comparisons: scopedComparisons,
    integrationSyncs: scopedIntegrationSyncs,
    auditEvents: scopedAuditEvents,
    ruleFamilies: scopedRuleFamilies,
    rules: scopedRules,
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { caseId: rawCaseId } = await context.params;
  const parsed = mayoCaseIdSchema.safeParse(rawCaseId);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid case ID" }, { status: 400 });
  }

  const authorization = await authorizeMayoCase(parsed.data, ["owner"]);
  if (!authorization.authorized) {
    return authorization.response;
  }

  const [documents] = await Promise.all([listMayoDocuments(parsed.data)]);
  const vectorStoreId = authorization.access.case.openaiVectorStoreId;
  const fileIds = documents
    .map((document) => document.openaiFileId)
    .filter((fileId): fileId is string => Boolean(fileId));

  await deleteMayoCaseRecord(parsed.data);
  after(async () => {
    await Promise.allSettled(
      documents.map((document) =>
        deleteMayoObject({
          bucket: document.bucket,
          objectPath: document.objectPath,
        })
      )
    );
    await deleteMayoOpenAIResources({ vectorStoreId, fileIds });
  });

  return NextResponse.json({ deleted: true });
}
