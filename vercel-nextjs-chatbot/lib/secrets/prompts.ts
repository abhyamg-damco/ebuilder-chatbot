import type { ActiveUserSecret } from "./types";

/**
 * Builds the system-prompt section that injects resolved secret values for the model.
 * Values are for tool use only — the agent must never echo them to the user.
 */
export function activeSecretsPrompt(secrets: ActiveUserSecret[]): string {
  if (secrets.length === 0) {
    return "";
  }

  const blocks = secrets.map(
    (secret) =>
      `### ${secret.name} (\`@secret:${secret.slug}\`, kind: ${secret.kind})\nValue: ${secret.value}`
  );

  return `
## Available secrets (ACTIVE — for tool use only)

The user referenced the following vault secrets. When calling browser tools
(\`browserAct\`, \`browserAgent\`, \`browserNavigate\`), you MUST put the **Value**
strings below into the tool arguments — never the slug names
(\`trimble-username\`, \`@secret:…\`, etc.).

**Never print, quote, or paraphrase secret values in your visible reply to the user.**
In chat replies, refer to them only by name (e.g. "signed in with your Trimble username").

${blocks.join("\n\n")}
`;
}
