import { z } from "zod";

/** Maximum secrets that can be active in a single chat message. */
export const MAX_SECRETS_PER_MESSAGE = 10;

/** Supported secret kinds for vault entries. */
export const SECRET_KINDS = [
  "password",
  "username",
  "url",
  "api_key",
  "other",
] as const;

export type SecretKind = (typeof SECRET_KINDS)[number];

const slugSchema = z
  .string()
  .min(1, "Slug is required")
  .max(64, "Slug must be 64 characters or fewer")
  .regex(
    /^[a-z0-9][a-z0-9-]*$/,
    "Slug must be lowercase letters, numbers, and hyphens only"
  );

const kindSchema = z.enum(SECRET_KINDS);

const baseSecretFields = {
  name: z
    .string()
    .min(1, "Name is required")
    .max(128, "Name must be 128 characters or fewer"),
  slug: slugSchema,
  kind: kindSchema.default("other"),
  value: z
    .string()
    .min(1, "Value is required")
    .max(8192, "Value must be 8192 characters or fewer"),
  description: z.string().max(500).optional(),
};

export const createUserSecretSchema = z.object(baseSecretFields);

export const updateUserSecretSchema = z.object({
  name: baseSecretFields.name.optional(),
  slug: slugSchema.optional(),
  kind: kindSchema.optional(),
  value: baseSecretFields.value.optional(),
  description: z.string().max(500).nullable().optional(),
});

/** Upsert by slug — used by Trimble setup to save site credentials. */
export const upsertUserSecretSchema = z.object({
  name: baseSecretFields.name,
  slug: slugSchema,
  kind: kindSchema.default("other"),
  value: baseSecretFields.value,
  description: z.string().max(500).optional(),
});

export type CreateUserSecretInput = z.infer<typeof createUserSecretSchema>;
export type UpdateUserSecretInput = z.infer<typeof updateUserSecretSchema>;
export type UpsertUserSecretInput = z.infer<typeof upsertUserSecretSchema>;

/** Public secret shape returned by list APIs (value always masked). */
export type UserSecretPublic = {
  id: string;
  name: string;
  slug: string;
  kind: SecretKind;
  value: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Secret loaded at runtime for system prompt injection (includes real value). */
export type ActiveUserSecret = {
  id: string;
  slug: string;
  name: string;
  kind: SecretKind;
  value: string;
};
