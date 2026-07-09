import type { UserSecret } from "@/lib/db/schema";
import type { SecretKind, UserSecretPublic } from "./types";

/** Mask shown in list/API responses instead of the real secret value. */
export const MASKED_SECRET_VALUE = "••••••••";

/** Convert a display name into a URL-safe slug for @secret: references. */
export function slugifySecretName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/** Convert a database row into a masked API-safe secret object. */
export function toPublicUserSecret(secret: UserSecret): UserSecretPublic {
  return {
    id: secret.id,
    name: secret.name,
    slug: secret.slug,
    kind: secret.kind as SecretKind,
    value: MASKED_SECRET_VALUE,
    description: secret.description,
    createdAt: secret.createdAt.toISOString(),
    updatedAt: secret.updatedAt.toISOString(),
  };
}

/**
 * Convert a database row into an API object that includes the real value.
 * Only use for edit forms after an explicit fetch — never for list endpoints.
 */
export function toRevealedUserSecret(secret: UserSecret): UserSecretPublic {
  return {
    id: secret.id,
    name: secret.name,
    slug: secret.slug,
    kind: secret.kind as SecretKind,
    value: secret.value,
    description: secret.description,
    createdAt: secret.createdAt.toISOString(),
    updatedAt: secret.updatedAt.toISOString(),
  };
}
