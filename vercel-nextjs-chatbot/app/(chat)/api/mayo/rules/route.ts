import { NextResponse } from "next/server";
import { requireRegularSession } from "@/app/(auth)/auth";
import {
  createMayoRuleVersion,
  getMayoCaseForUser,
  listLatestMayoRules,
} from "@/lib/mayo/db";
import { createMayoRuleSchema } from "@/lib/mayo/schemas";

export async function GET() {
  const session = await requireRegularSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rules = await listLatestMayoRules(session.user.id);
  return NextResponse.json({ rules });
}

export async function POST(request: Request) {
  const session = await requireRegularSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const parsed = createMayoRuleSchema.parse(await request.json());
    const access = parsed.caseId
      ? await getMayoCaseForUser({
          caseId: parsed.caseId,
          userId: session.user.id,
        })
      : null;
    if (
      parsed.caseId &&
      (!access || !["owner", "admin"].includes(access.membership.role))
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const rule = await createMayoRuleVersion({
      ownerUserId: access?.case.ownerUserId ?? session.user.id,
      createdByUserId: session.user.id,
      familyId: parsed.familyId,
      code: parsed.code,
      name: parsed.name,
      description: parsed.description,
      kind: parsed.kind,
      severity: parsed.severity,
      enabled: parsed.enabled,
      config: parsed.config,
    });
    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create rule",
      },
      { status: 400 }
    );
  }
}
