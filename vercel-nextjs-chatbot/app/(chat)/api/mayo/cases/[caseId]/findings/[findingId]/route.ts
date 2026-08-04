import { NextResponse } from "next/server";
import { authorizeMayoCase, canAccessMayoRuleFamily } from "@/lib/mayo/auth";
import {
  appendMayoAuditEvent,
  getMayoCaseForUser,
  listMayoFindings,
  updateMayoFindingDecision,
} from "@/lib/mayo/db";
import { updateMayoFindingSchema } from "@/lib/mayo/schemas";

type RouteContext = {
  params: Promise<{ caseId: string; findingId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { caseId, findingId } = await context.params;
  const authorization = await authorizeMayoCase(caseId, [
    "owner",
    "admin",
    "reviewer",
  ]);
  if (!authorization.authorized) {
    return authorization.response;
  }

  const finding = (await listMayoFindings(caseId)).find(
    (candidate) => candidate.id === findingId
  );
  if (!finding) {
    return NextResponse.json({ error: "Finding not found" }, { status: 404 });
  }
  if (
    !canAccessMayoRuleFamily(
      authorization.access.membership,
      finding.ruleFamilyId
    )
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const parsed = updateMayoFindingSchema.parse(await request.json());
    if (
      parsed.assignedReviewerId &&
      !["owner", "admin"].includes(authorization.access.membership.role)
    ) {
      return NextResponse.json(
        { error: "Only case owners and admins can assign findings" },
        { status: 403 }
      );
    }
    if (parsed.assignedReviewerId) {
      const assignedMember = await getMayoCaseForUser({
        caseId,
        userId: parsed.assignedReviewerId,
      });
      if (!assignedMember) {
        return NextResponse.json(
          { error: "Assigned reviewer must be a member of this case" },
          { status: 400 }
        );
      }
    }
    const updated = await updateMayoFindingDecision({
      findingId,
      userId: authorization.session.user.id,
      ...parsed,
    });
    await appendMayoAuditEvent({
      caseId,
      actorUserId: authorization.session.user.id,
      eventType: "finding.reviewed",
      entityType: "finding",
      entityId: findingId,
      metadata: {
        previousStatus: finding.status,
        status: updated.status,
        assignedReviewerId: updated.assignedReviewerId,
        hasComment: Boolean(parsed.comment),
      },
    });
    return NextResponse.json({ finding: updated });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to update finding",
      },
      { status: 400 }
    );
  }
}
