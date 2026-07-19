import type { UserType } from "@/app/(auth)/auth";

export type PersonaScope = { userId: string };

/** Personas are scoped to signed-in users only. */
export function getPersonaScope(
  userType: UserType,
  userId: string
): PersonaScope | null {
  if (userType === "guest") {
    return null;
  }
  return { userId };
}
