import type { ActiveAgentSkill } from "./types";

/**
 * Formats active skills into a system prompt section.
 * Injected when the user @mentions skills in their message.
 */
export function activeSkillsPrompt(skills: ActiveAgentSkill[]): string {
  if (skills.length === 0) {
    return "";
  }

  const sections = skills.map(
    (skill) => `### @${skill.slug} (${skill.name})\n${skill.content.trim()}`
  );

  return `## Active skills (follow these instructions for this turn)

${sections.join("\n\n")}

When a skill is active:
- Prioritize its instructions for this response.
- Use existing tools (MCP, browser, artifacts) as the skill directs.
- Execute the **full** skill workflow autonomously — chain browser/MCP tool calls until complete.
- Do **not** stop after each sub-step to ask the user to confirm what they see on screen.
- Only pause when the skill requires input you do not have (e.g. OTP not yet provided).`;
}
