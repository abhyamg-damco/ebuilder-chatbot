import { after, NextResponse } from "next/server";
import {
  authorizeMayoCase,
  canAccessMayoDocumentCategory,
} from "@/lib/mayo/auth";
import {
  appendMayoAuditEvent,
  getMayoDocumentById,
  updateMayoDocumentIndexing,
} from "@/lib/mayo/db";
import { deleteMayoOpenAIResources } from "@/lib/mayo/openai";
import { deleteMayoObject } from "@/lib/mayo/storage";

type RouteContext = {
  params: Promise<{ caseId: string; documentId: string }>;
};

export const maxDuration = 300;

export async function DELETE(_request: Request, context: RouteContext) {
  const { caseId, documentId } = await context.params;
  const authorization = await authorizeMayoCase(caseId, ["owner", "admin"]);
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

  await updateMayoDocumentIndexing({
    documentId,
    status: "deleted",
  });
  await appendMayoAuditEvent({
    caseId,
    actorUserId: authorization.session.user.id,
    eventType: "document.deleted",
    entityType: "document",
    entityId: documentId,
    metadata: { filename: document.originalFilename },
  });
  after(async () => {
    await deleteMayoObject({
      bucket: document.bucket,
      objectPath: document.objectPath,
    }).catch(() => undefined);
    if (document.openaiFileId) {
      await deleteMayoOpenAIResources({
        fileIds: [document.openaiFileId],
      });
    }
  });

  return NextResponse.json({ deleted: true });
}
