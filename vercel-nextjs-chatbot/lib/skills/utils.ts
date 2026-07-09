import type { AgentSkill } from "@/lib/db/schema";
import type { AgentSkillPublic } from "./types";

/** Convert a display name into a URL-safe slug for @mentions. */
export function slugifySkillName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/** Convert a database row into an API-safe skill object. */
export function toPublicAgentSkill(skill: AgentSkill): AgentSkillPublic {
  return {
    id: skill.id,
    name: skill.name,
    slug: skill.slug,
    description: skill.description,
    content: skill.content,
    enabled: skill.enabled,
    createdAt: skill.createdAt.toISOString(),
    updatedAt: skill.updatedAt.toISOString(),
  };
}
