import type { UserType } from "@/app/(auth)/auth";

/** Per-user scope for vault secrets (signed-in users only). */
export type UserSecretScope = { userId: string };

/**
 * Returns the secret scope for a user, or null for guests who cannot manage secrets.
 */
export function getUserSecretScope(
  userType: UserType,
  userId: string
): UserSecretScope | null {
  if (userType === "guest") {
    return null;
  }

  return { userId };
}
