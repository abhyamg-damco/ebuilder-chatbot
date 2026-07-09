import { z } from "zod";

/** Maximum characters allowed in skill instruction content. */
export const MAX_SKILL_CONTENT_LENGTH = 16_384;

/** Maximum skills that can be active in a single chat message. */
export const MAX_SKILLS_PER_MESSAGE = 5;

const slugSchema = z
  .string()
  .min(1, "Slug is required")
  .max(64, "Slug must be 64 characters or fewer")
  .regex(
    /^[a-z0-9][a-z0-9-]*$/,
    "Slug must be lowercase letters, numbers, and hyphens only"
  );

const baseSkillFields = {
  name: z
    .string()
    .min(1, "Name is required")
    .max(128, "Name must be 128 characters or fewer"),
  slug: slugSchema,
  description: z.string().max(500).optional(),
  content: z
    .string()
    .min(1, "Content is required")
    .max(
      MAX_SKILL_CONTENT_LENGTH,
      `Content must be ${MAX_SKILL_CONTENT_LENGTH} characters or fewer`
    ),
  enabled: z.boolean().default(true),
};

export const createAgentSkillSchema = z.object(baseSkillFields);

export const updateAgentSkillSchema = z.object({
  name: baseSkillFields.name.optional(),
  slug: slugSchema.optional(),
  description: z.string().max(500).nullable().optional(),
  content: baseSkillFields.content.optional(),
  enabled: z.boolean().optional(),
});

export type CreateAgentSkillInput = z.infer<typeof createAgentSkillSchema>;
export type UpdateAgentSkillInput = z.infer<typeof updateAgentSkillSchema>;

/** Public skill shape returned by the API. */
export type AgentSkillPublic = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  content: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Skill loaded at runtime for system prompt injection. */
export type ActiveAgentSkill = {
  id: string;
  slug: string;
  name: string;
  content: string;
};
