import { NextResponse } from "next/server";
import { requireRegularSession } from "@/app/(auth)/auth";
import { createMayoCaseRecord, listMayoCasesForUser } from "@/lib/mayo/db";
import { createMayoCaseSchema } from "@/lib/mayo/schemas";

export async function GET() {
  const session = await requireRegularSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cases = await listMayoCasesForUser(session.user.id);
  return NextResponse.json({ cases });
}

export async function POST(request: Request) {
  const session = await requireRegularSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = createMayoCaseSchema.parse(await request.json());
    const record = await createMayoCaseRecord({
      ownerUserId: session.user.id,
      ...parsed,
    });
    return NextResponse.json({ case: record }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create case",
      },
      { status: 400 }
    );
  }
}
