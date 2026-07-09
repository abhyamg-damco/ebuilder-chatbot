import {
  getAgentSkillsByIds,
  getEnabledAgentSkillsBySlugs,
} from "@/lib/db/queries";
import type { ActiveAgentSkill } from "./types";
import { MAX_SKILLS_PER_MESSAGE } from "./types";

/** Matches @slug tokens at word boundaries (avoids email and @secret: references). */
const SKILL_MENTION_PATTERN = /(?:^|\s)@(?!secret:)([a-z0-9][a-z0-9-]*)/gi;

/**
 * Extracts skill slugs from @mentions in user message text.
 * Only matches @ at the start of the string or after whitespace.
 */
export function parseSkillMentions(text: string): string[] {
  const slugs = new Set<string>();
  const pattern = new RegExp(SKILL_MENTION_PATTERN.source, SKILL_MENTION_PATTERN.flags);

  for (const match of text.matchAll(pattern)) {
    const slug = match[1];
    if (slug) {
      slugs.add(slug.toLowerCase());
    }
  }

  return [...slugs];
}

/**
 * Loads enabled skills referenced by slugs and/or IDs for a signed-in user.
 * Server-side resolution is the source of truth for which skills are active.
 */
export async function resolveReferencedSkills({
  userId,
  slugs = [],
  skillIds = [],
}: {
  userId: string;
  slugs?: string[];
  skillIds?: string[];
}): Promise<ActiveAgentSkill[]> {
  const uniqueSlugs = [...new Set(slugs.map((slug) => slug.toLowerCase()))];
  const uniqueIds = [...new Set(skillIds)];

  const [bySlug, byId] = await Promise.all([
    uniqueSlugs.length > 0
      ? getEnabledAgentSkillsBySlugs({ userId, slugs: uniqueSlugs })
      : Promise.resolve([]),
    uniqueIds.length > 0
      ? getAgentSkillsByIds({ userId, ids: uniqueIds })
      : Promise.resolve([]),
  ]);

  const seen = new Set<string>();
  const merged: ActiveAgentSkill[] = [];

  for (const skill of [...bySlug, ...byId]) {
    if (!skill.enabled || seen.has(skill.id)) {
      continue;
    }

    seen.add(skill.id);
    merged.push({
      id: skill.id,
      slug: skill.slug,
      name: skill.name,
      content: skill.content,
    });

    if (merged.length >= MAX_SKILLS_PER_MESSAGE) {
      break;
    }
  }

  return merged;
}
