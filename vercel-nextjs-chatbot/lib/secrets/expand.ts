import type { ActiveUserSecret } from "./types";

/** Matches @secret:slug in tool instructions / URLs. */
const SECRET_REF_PATTERN = /@secret:([a-z0-9][a-z0-9-]*)/gi;

/**
 * Replaces @secret:slug (and bare known slugs) with vault values before
 * Stagehand / browserAgent receives the instruction.
 *
 * The chat model often passes slug names instead of real credentials;
 * this is the authoritative expansion so login fields get real values.
 */
export function expandSecretsInText(
  text: string,
  secrets: ActiveUserSecret[]
): string {
  if (!text || secrets.length === 0) {
    return text;
  }

  const bySlug = new Map(
    secrets.map((secret) => [secret.slug.toLowerCase(), secret.value])
  );

  let expanded = text.replace(SECRET_REF_PATTERN, (match, slug: string) => {
    const value = bySlug.get(slug.toLowerCase());
    return value ?? match;
  });

  // Also replace bare slug tokens the model may pass (e.g. type "trimble-username").
  // Longer slugs first so partial overlaps do not corrupt replacements.
  const slugsByLength = [...bySlug.keys()].sort((a, b) => b.length - a.length);

  for (const slug of slugsByLength) {
    const value = bySlug.get(slug);
    if (value === undefined) {
      continue;
    }

    const bareSlugPattern = new RegExp(
      `(?<![a-z0-9-])${escapeRegExp(slug)}(?![a-z0-9-])`,
      "gi"
    );
    expanded = expanded.replace(bareSlugPattern, () => value);
  }

  return expanded;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Replaces known secret values with `@secret:slug` so tool results / logs
 * do not leak credentials back into the chat transcript.
 */
export function redactSecretsInText(
  text: string,
  secrets: ActiveUserSecret[]
): string {
  if (!text || secrets.length === 0) {
    return text;
  }

  // Longer values first to avoid partial overlaps.
  const sorted = [...secrets].sort(
    (a, b) => b.value.length - a.value.length
  );

  let redacted = text;
  for (const secret of sorted) {
    if (!secret.value) {
      continue;
    }
    const valuePattern = new RegExp(escapeRegExp(secret.value), "g");
    redacted = redacted.replace(valuePattern, `@secret:${secret.slug}`);
  }

  return redacted;
}
