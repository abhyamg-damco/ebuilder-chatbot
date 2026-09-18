import { after, NextResponse } from "next/server";
import {
  authorizeMayoCase,
  canAccessMayoDocumentCategory,
} from "@/lib/mayo/auth";
import { getMayoDocumentById } from "@/lib/mayo/db";
import { indexMayoDocumentJob } from "@/lib/mayo/openai";

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
  if (!["uploaded", "failed"].includes(document.status)) {
    return NextResponse.json(
      { error: "Only uploaded or failed documents can be retried" },
      { status: 409 }
    );
  }

  after(() => indexMayoDocumentJob(documentId));
  return NextResponse.json({ accepted: true }, { status: 202 });
}
