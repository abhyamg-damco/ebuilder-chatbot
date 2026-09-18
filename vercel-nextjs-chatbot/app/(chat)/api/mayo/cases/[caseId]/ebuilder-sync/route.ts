import { after, NextResponse } from "next/server";
import {
  authorizeMayoCase,
  canAccessMayoDocumentCategory,
} from "@/lib/mayo/auth";
import {
  appendMayoAuditEvent,
  createMayoIntegrationSyncRecord,
} from "@/lib/mayo/db";
import { runMayoEbuilderSyncJob } from "@/lib/mayo/ebuilder";
import { syncMayoEbuilderSchema } from "@/lib/mayo/schemas";

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
  if (
    !canAccessMayoDocumentCategory(
      authorization.access.membership,
      "ebuilder_export"
    )
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const parsed = syncMayoEbuilderSchema.parse(await request.json());
    const syncRecord = await createMayoIntegrationSyncRecord({
      caseId,
      userId: authorization.session.user.id,
      request: parsed,
    });
    await appendMayoAuditEvent({
      caseId,
      actorUserId: authorization.session.user.id,
      eventType: "ebuilder_sync.queued",
      entityType: "integration_sync",
      entityId: syncRecord.id,
      metadata: parsed,
    });
    after(() =>
      runMayoEbuilderSyncJob({
        syncId: syncRecord.id,
        userId: authorization.session.user.id,
        userType: authorization.session.user.type,
      })
    );
    return NextResponse.json({ sync: syncRecord }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to start eBuilder synchronization",
      },
      { status: 400 }
    );
  }
}
