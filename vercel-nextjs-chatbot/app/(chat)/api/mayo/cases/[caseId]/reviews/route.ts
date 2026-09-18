import { after, NextResponse } from "next/server";
import {
  authorizeMayoCase,
  canAccessMayoDocumentCategory,
  canAccessMayoRuleFamily,
} from "@/lib/mayo/auth";
import {
  appendMayoAuditEvent,
  createMayoReviewRunRecord,
  listLatestMayoRules,
  listMayoDocuments,
} from "@/lib/mayo/db";
import { getMayoModel, runMayoReviewJob } from "@/lib/mayo/openai";
import { MAYO_PROMPT_VERSION } from "@/lib/mayo/prompts";
import { runMayoReviewSchema } from "@/lib/mayo/schemas";

type RouteContext = {
  params: Promise<{ caseId: string }>;
};

export const maxDuration = 300;

export async function POST(request: Request, context: RouteContext) {
  const { caseId } = await context.params;
  const authorization = await authorizeMayoCase(caseId, [
    "owner",
    "admin",
    "reviewer",
  ]);
  if (!authorization.authorized) {
    return authorization.response;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = runMayoReviewSchema.parse(body);
    const [documents, rules] = await Promise.all([
      listMayoDocuments(caseId),
      listLatestMayoRules(authorization.access.case.ownerUserId),
    ]);
    const readyIds = new Set(
      documents
        .filter(
          (document) =>
            document.status === "ready" &&
            canAccessMayoDocumentCategory(
              authorization.access.membership,
              document.category
            )
        )
        .map((document) => document.id)
    );
    const scopedRules = rules.filter((rule) =>
      canAccessMayoRuleFamily(authorization.access.membership, rule.familyId)
    );
    const requestedIds =
      parsed.documentIds && parsed.documentIds.length > 0
        ? parsed.documentIds
        : [...readyIds];

    if (
      requestedIds.length === 0 ||
      requestedIds.some((documentId) => !readyIds.has(documentId))
    ) {
      return NextResponse.json(
        { error: "All selected documents must finish OpenAI indexing" },
        { status: 409 }
      );
    }

    const run = await createMayoReviewRunRecord({
      caseId,
      userId: authorization.session.user.id,
      model: getMayoModel(),
      promptVersion: MAYO_PROMPT_VERSION,
      rules: scopedRules,
      documentIds: requestedIds,
    });
    await appendMayoAuditEvent({
      caseId,
      actorUserId: authorization.session.user.id,
      eventType: "review.queued",
      entityType: "review_run",
      entityId: run.id,
      metadata: { documentIds: requestedIds },
    });
    after(() =>
      runMayoReviewJob({
        runId: run.id,
        actorUserId: authorization.session.user.id,
      })
    );
    return NextResponse.json({ reviewRun: run }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to start review",
      },
      { status: 400 }
    );
  }
}
