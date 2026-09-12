import { after, NextResponse } from "next/server";
import {
  authorizeMayoCase,
  canAccessMayoDocumentCategory,
} from "@/lib/mayo/auth";
import {
  appendMayoAuditEvent,
  getMayoDocumentById,
  updateMayoDocumentIndexing,
  updateMayoDocumentMetadata,
} from "@/lib/mayo/db";
import { deleteMayoOpenAIResources } from "@/lib/mayo/openai";
import { updateMayoDocumentSchema } from "@/lib/mayo/schemas";
import { deleteMayoObject } from "@/lib/mayo/storage";

type RouteContext = {
  params: Promise<{ caseId: string; documentId: string }>;
};

export const maxDuration = 300;

export async function PATCH(request: Request, context: RouteContext) {
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
  if (document.status === "deleted") {
    return NextResponse.json(
      { error: "This document has been deleted" },
      { status: 409 }
    );
  }

  try {
    const parsed = updateMayoDocumentSchema.parse(await request.json());
    const updated = await updateMayoDocumentMetadata({
      documentId,
      category: parsed.category,
      stage: parsed.stage,
    });
    await appendMayoAuditEvent({
      caseId,
      actorUserId: authorization.session.user.id,
      eventType: "document.updated",
      entityType: "document",
      entityId: documentId,
      metadata: {
        filename: document.originalFilename,
        ...(parsed.category !== undefined && {
          category: { from: document.category, to: parsed.category },
        }),
        ...(parsed.stage !== undefined && {
          stage: { from: document.stage, to: parsed.stage },
        }),
      },
    });
    return NextResponse.json({ document: updated });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update this document",
      },
      { status: 400 }
    );
  }
}

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
