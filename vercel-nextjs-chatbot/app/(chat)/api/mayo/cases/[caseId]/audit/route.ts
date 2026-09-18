import { NextResponse } from "next/server";
import { authorizeMayoCase } from "@/lib/mayo/auth";
import { listMayoAuditEvents } from "@/lib/mayo/db";
import { mayoAuditQuerySchema } from "@/lib/mayo/schemas";

type RouteContext = {
  params: Promise<{ caseId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { caseId } = await context.params;
  const authorization = await authorizeMayoCase(caseId);
  if (!authorization.authorized) {
    return authorization.response;
  }
  const url = new URL(request.url);
  const parsed = mayoAuditQuerySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }
  const auditEvents = await listMayoAuditEvents({
    caseId,
    limit: parsed.data.limit,
  });
  return NextResponse.json({ auditEvents });
}
