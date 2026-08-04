import { NextResponse } from "next/server";
import { requireRegularSession } from "@/app/(auth)/auth";
import {
  createMayoRuleFamilyRecord,
  getMayoCaseForUser,
  listMayoRuleFamilies,
} from "@/lib/mayo/db";
import { createMayoRuleFamilySchema } from "@/lib/mayo/schemas";

export async function GET() {
  const session = await requireRegularSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const families = await listMayoRuleFamilies(session.user.id);
  return NextResponse.json({ families });
}

export async function POST(request: Request) {
  const session = await requireRegularSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const parsed = createMayoRuleFamilySchema.parse(await request.json());
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
    const family = await createMayoRuleFamilyRecord({
      ownerUserId: access?.case.ownerUserId ?? session.user.id,
      code: parsed.code,
      name: parsed.name,
      description: parsed.description,
    });
    return NextResponse.json({ family }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create rule family",
      },
      { status: 400 }
    );
  }
}
