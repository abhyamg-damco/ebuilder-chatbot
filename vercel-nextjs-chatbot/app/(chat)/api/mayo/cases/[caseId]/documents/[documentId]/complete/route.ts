import { after, NextResponse } from "next/server";
import {
  authorizeMayoCase,
  canAccessMayoDocumentCategory,
} from "@/lib/mayo/auth";
import {
  appendMayoAuditEvent,
  completeMayoDocumentUpload,
  findMayoDocumentByChecksum,
  getMayoDocumentById,
  updateMayoDocumentIndexing,
} from "@/lib/mayo/db";
import { indexMayoDocumentJob } from "@/lib/mayo/openai";
import {
  deleteMayoObject,
  inspectAndHashMayoObject,
  isAllowedMayoMimeType,
  MAYO_MAX_DOCUMENT_BYTES,
} from "@/lib/mayo/storage";

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

  try {
    const inspected = await inspectAndHashMayoObject({
      bucket: document.bucket,
      objectPath: document.objectPath,
    });
    if (inspected.sizeBytes > MAYO_MAX_DOCUMENT_BYTES) {
      throw new Error("Document exceeds the 512 MB Mayo limit");
    }
    if (!isAllowedMayoMimeType(inspected.contentType)) {
      throw new Error("GCS object content type is not supported");
    }

    const duplicate = await findMayoDocumentByChecksum({
      caseId,
      checksumSha256: inspected.checksumSha256,
      excludeDocumentId: document.id,
    });
    if (duplicate) {
      await deleteMayoObject({
        bucket: document.bucket,
        objectPath: document.objectPath,
      });
      await updateMayoDocumentIndexing({
        documentId: document.id,
        status: "deleted",
        errorMessage: "Duplicate document",
      });
      return NextResponse.json(
        {
          error: "This document is already in the case",
          duplicateDocumentId: duplicate.id,
        },
        { status: 409 }
      );
    }

    const completed = await completeMayoDocumentUpload({
      documentId: document.id,
      checksumSha256: inspected.checksumSha256,
      sizeBytes: inspected.sizeBytes,
    });
    await appendMayoAuditEvent({
      caseId,
      actorUserId: authorization.session.user.id,
      eventType: "document.upload_completed",
      entityType: "document",
      entityId: document.id,
      metadata: {
        checksumSha256: inspected.checksumSha256,
        sizeBytes: inspected.sizeBytes,
      },
    });
    after(() => indexMayoDocumentJob(document.id));

    return NextResponse.json({ document: completed }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateMayoDocumentIndexing({
      documentId: document.id,
      status: "failed",
      errorMessage: message,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
