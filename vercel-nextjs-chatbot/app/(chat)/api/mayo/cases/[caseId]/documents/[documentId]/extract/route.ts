import { after, NextResponse } from "next/server";
import {
  authorizeMayoCase,
  canAccessMayoDocumentCategory,
} from "@/lib/mayo/auth";
import {
  getMayoDocumentById,
  upsertMayoExtractionPending,
} from "@/lib/mayo/db";
import {
  extractMayoDocumentJob,
  getMayoModel,
  MAYO_DIRECT_FILE_INPUT_MAX_BYTES,
} from "@/lib/mayo/openai";
import { MAYO_PROMPT_VERSION } from "@/lib/mayo/prompts";

type RouteContext = {
  params: Promise<{ caseId: string; documentId: string }>;
};

export const maxDuration = 300;

export async function POST(_request: Request, context: RouteContext) {
  const { caseId, documentId } = await context.params;
  const authorization = await authorizeMayoCase(caseId, [
    "owner",
    "admin",
    "reviewer",
  ]);
  if (!authorization.authorized) {
    return authorization.response;
  }
  const document = await getMayoDocumentById(documentId);
  if (!document || document.caseId !== caseId) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  if (
    !canAccessMayoDocumentCategory(
      authorization.access.membership,
      document.category
    )
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (document.status !== "ready" || !document.openaiFileId) {
    return NextResponse.json(
      { error: "Document must finish OpenAI indexing before extraction" },
      { status: 409 }
    );
  }
  if (document.sizeBytes > MAYO_DIRECT_FILE_INPUT_MAX_BYTES) {
    return NextResponse.json(
      {
        error:
          "Direct extraction is limited to 50 MB. Run case review to use hosted File Search.",
      },
      { status: 413 }
    );
  }

  const extraction = await upsertMayoExtractionPending({
    caseId,
    documentId,
    model: getMayoModel(),
    promptVersion: MAYO_PROMPT_VERSION,
  });
  after(() =>
    extractMayoDocumentJob({
      documentId,
      actorUserId: authorization.session.user.id,
    })
  );

  return NextResponse.json({ extraction }, { status: 202 });
}
