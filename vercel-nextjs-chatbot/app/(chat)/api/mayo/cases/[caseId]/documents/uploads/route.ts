import { NextResponse } from "next/server";
import {
  authorizeMayoCase,
  canAccessMayoDocumentCategory,
} from "@/lib/mayo/auth";
import { createMayoDocumentRecord } from "@/lib/mayo/db";
import { initiateMayoUploadSchema } from "@/lib/mayo/schemas";
import {
  buildMayoObjectPath,
  createMayoResumableUpload,
  isAllowedMayoMimeType,
} from "@/lib/mayo/storage";
import { isGcsStorageEnabled } from "@/lib/storage/config";
import { getRequestOrigin } from "@/lib/storage/urls";
import { generateUUID } from "@/lib/utils";

type RouteContext = {
  params: Promise<{ caseId: string }>;
};

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
  if (!isGcsStorageEnabled()) {
    return NextResponse.json(
      { error: "GCS storage is not configured" },
      { status: 503 }
    );
  }

  try {
    const parsed = initiateMayoUploadSchema.parse(await request.json());
    if (
      !canAccessMayoDocumentCategory(
        authorization.access.membership,
        parsed.category
      )
    ) {
      return NextResponse.json(
        { error: "Your case scope does not allow this document category" },
        { status: 403 }
      );
    }
    if (!isAllowedMayoMimeType(parsed.mimeType)) {
      return NextResponse.json(
        {
          error:
            "Unsupported Mayo document type. Use PDF, DOC, DOCX, PPTX, TXT, Markdown, or JSON.",
        },
        { status: 400 }
      );
    }

    const documentId = generateUUID();
    const objectPath = buildMayoObjectPath({
      caseId,
      documentId,
      filename: parsed.filename,
    });
    const upload = await createMayoResumableUpload({
      objectPath,
      mimeType: parsed.mimeType,
      origin: getRequestOrigin(request),
    });
    const document = await createMayoDocumentRecord({
      id: documentId,
      caseId,
      userId: authorization.session.user.id,
      category: parsed.category,
      stage: parsed.stage,
      revision: parsed.revision,
      paymentApplicationNumber: parsed.paymentApplicationNumber,
      filename: parsed.filename,
      mimeType: parsed.mimeType,
      sizeBytes: parsed.sizeBytes,
      bucket: upload.bucket,
      objectPath,
    });

    return NextResponse.json(
      {
        document,
        uploadUrl: upload.uploadUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to initialize upload",
      },
      { status: 400 }
    );
  }
}
