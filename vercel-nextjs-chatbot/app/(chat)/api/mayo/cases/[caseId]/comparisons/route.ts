import { after, NextResponse } from "next/server";
import {
  authorizeMayoCase,
  canAccessMayoDocumentCategory,
} from "@/lib/mayo/auth";
import {
  appendMayoAuditEvent,
  createMayoComparisonRecord,
  getMayoDocumentById,
} from "@/lib/mayo/db";
import { compareMayoDocumentsJob, getMayoModel } from "@/lib/mayo/openai";
import { MAYO_PROMPT_VERSION } from "@/lib/mayo/prompts";
import { compareMayoDocumentsSchema } from "@/lib/mayo/schemas";

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
    const parsed = compareMayoDocumentsSchema.parse(await request.json());
    const [draft, final] = await Promise.all([
      getMayoDocumentById(parsed.draftDocumentId),
      getMayoDocumentById(parsed.finalDocumentId),
    ]);
    if (
      !draft ||
      !final ||
      draft.caseId !== caseId ||
      final.caseId !== caseId
    ) {
      return NextResponse.json(
        { error: "Draft or final document not found" },
        { status: 404 }
      );
    }
    if (
      !canAccessMayoDocumentCategory(
        authorization.access.membership,
        draft.category
      ) ||
      !canAccessMayoDocumentCategory(
        authorization.access.membership,
        final.category
      )
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (
      draft.stage !== "draft" ||
      final.stage !== "final" ||
      draft.status !== "ready" ||
      final.status !== "ready"
    ) {
      return NextResponse.json(
        {
          error:
            "Select one indexed draft document and one indexed final document",
        },
        { status: 409 }
      );
    }

    const comparison = await createMayoComparisonRecord({
      caseId,
      userId: authorization.session.user.id,
      model: getMayoModel(),
      promptVersion: MAYO_PROMPT_VERSION,
      ...parsed,
    });
    await appendMayoAuditEvent({
      caseId,
      actorUserId: authorization.session.user.id,
      eventType: "comparison.queued",
      entityType: "draft_comparison",
      entityId: comparison.id,
      metadata: parsed,
    });
    after(() =>
      compareMayoDocumentsJob({
        comparisonId: comparison.id,
        actorUserId: authorization.session.user.id,
      })
    );
    return NextResponse.json({ comparison }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to start comparison",
      },
      { status: 400 }
    );
  }
}
