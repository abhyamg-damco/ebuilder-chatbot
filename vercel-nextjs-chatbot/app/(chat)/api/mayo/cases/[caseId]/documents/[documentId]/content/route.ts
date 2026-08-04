import { NextResponse } from "next/server";
import {
  authorizeMayoCase,
  canAccessMayoDocumentCategory,
} from "@/lib/mayo/auth";
import { getMayoDocumentById } from "@/lib/mayo/db";
import { getSignedReadUrl } from "@/lib/storage/upload";

type RouteContext = {
  params: Promise<{ caseId: string; documentId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { caseId, documentId } = await context.params;
  const authorization = await authorizeMayoCase(caseId);
  if (!authorization.authorized) {
    return authorization.response;
  }
  const document = await getMayoDocumentById(documentId);
  if (
    !document ||
    document.caseId !== caseId ||
    document.status === "deleted"
  ) {
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
    const signed = await getSignedReadUrl({
      bucket: document.bucket,
      objectPath: document.objectPath,
    });
    return NextResponse.redirect(signed.url);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to open document",
      },
      { status: 500 }
    );
  }
}
