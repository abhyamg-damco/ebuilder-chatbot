import "server-only";

import { NextResponse } from "next/server";
import { requireRegularSession } from "@/app/(auth)/auth";
import type { MayoCaseMember } from "@/lib/db/schema";
import { getMayoCaseForUser } from "./db";
import type { MayoDocumentCategory } from "./types";

type MayoRole = MayoCaseMember["role"];

export type MayoAuthorization =
  | {
      authorized: true;
      session: NonNullable<Awaited<ReturnType<typeof requireRegularSession>>>;
      access: NonNullable<Awaited<ReturnType<typeof getMayoCaseForUser>>>;
    }
  | {
      authorized: false;
      response: NextResponse;
    };

export async function authorizeMayoCase(
  caseId: string,
  allowedRoles?: MayoRole[]
): Promise<MayoAuthorization> {
  const session = await requireRegularSession();
  if (!session?.user) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const access = await getMayoCaseForUser({
    caseId,
    userId: session.user.id,
  });
  if (!access) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Case not found" }, { status: 404 }),
    };
  }

  if (allowedRoles && !allowedRoles.includes(access.membership.role)) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { authorized: true, session, access };
}

export function canAccessMayoDocumentCategory(
  member: MayoCaseMember,
  category: MayoDocumentCategory
): boolean {
  if (member.role === "owner" || member.role === "admin") {
    return true;
  }
  const allowed = member.scopes.documentCategories;
  return !allowed?.length || allowed.includes(category);
}

export function canAccessMayoRuleFamily(
  member: MayoCaseMember,
  familyId: string | null
): boolean {
  if (member.role === "owner" || member.role === "admin") {
    return true;
  }
  const allowed = member.scopes.ruleFamilyIds;
  return !allowed?.length || (familyId !== null && allowed.includes(familyId));
}
