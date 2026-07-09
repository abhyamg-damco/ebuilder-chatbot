import type { UserType } from "@/app/(auth)/auth";

/** Per-user scope for agent skills (signed-in users only). */
export type AgentSkillScope = { userId: string };

/**
 * Returns the skill scope for a user, or null for guests who cannot manage skills.
 */
export function getAgentSkillScope(
  userType: UserType,
  userId: string
): AgentSkillScope | null {
  if (userType === "guest") {
    return null;
  }

  return { userId };
}
