import {
  getUserSecretsByIds,
  getUserSecretsBySlugs,
} from "@/lib/db/queries";
import type { ActiveUserSecret, SecretKind } from "./types";
import { MAX_SECRETS_PER_MESSAGE } from "./types";

/**
 * Matches @secret:slug tokens at word boundaries.
 * Example: "Login with @secret:trimble-password"
 */
const SECRET_MENTION_PATTERN = /(?:^|\s)@secret:([a-z0-9][a-z0-9-]*)/gi;

/**
 * Extracts secret slugs from @secret:slug mentions in user message text.
 */
export function parseSecretMentions(text: string): string[] {
  const slugs = new Set<string>();
  const pattern = new RegExp(
    SECRET_MENTION_PATTERN.source,
    SECRET_MENTION_PATTERN.flags
  );

  for (const match of text.matchAll(pattern)) {
    const slug = match[1];
    if (slug) {
      slugs.add(slug.toLowerCase());
    }
  }

  return [...slugs];
}

/**
 * Collects @secret:slug mentions across every user message in the chat.
 * Needed for OTP / follow-up turns that no longer repeat the kickoff text.
 */
export function parseSecretMentionsFromMessages(
  messages: Array<{ role?: string; parts?: Array<{ type?: string; text?: string }> }>
): string[] {
  const slugs = new Set<string>();

  for (const message of messages) {
    if (message.role !== "user" || !message.parts) {
      continue;
    }

    for (const part of message.parts) {
      if (part.type !== "text" || !part.text) {
        continue;
      }

      for (const slug of parseSecretMentions(part.text)) {
        slugs.add(slug);
      }
    }
  }

  return [...slugs];
}

/**
 * Loads secrets referenced by slugs and/or IDs for a signed-in user.
 * Server-side resolution is the source of truth for which secrets are active.
 */
export async function resolveReferencedSecrets({
  userId,
  slugs = [],
  secretIds = [],
}: {
  userId: string;
  slugs?: string[];
  secretIds?: string[];
}): Promise<ActiveUserSecret[]> {
  const uniqueSlugs = [...new Set(slugs.map((slug) => slug.toLowerCase()))];
  const uniqueIds = [...new Set(secretIds)];

  const [bySlug, byId] = await Promise.all([
    uniqueSlugs.length > 0
      ? getUserSecretsBySlugs({ userId, slugs: uniqueSlugs })
      : Promise.resolve([]),
    uniqueIds.length > 0
      ? getUserSecretsByIds({ userId, ids: uniqueIds })
      : Promise.resolve([]),
  ]);

  const seen = new Set<string>();
  const merged: ActiveUserSecret[] = [];

  for (const secret of [...bySlug, ...byId]) {
    if (seen.has(secret.id)) {
      continue;
    }

    seen.add(secret.id);
    merged.push({
      id: secret.id,
      slug: secret.slug,
      name: secret.name,
      kind: secret.kind as SecretKind,
      value: secret.value,
    });

    if (merged.length >= MAX_SECRETS_PER_MESSAGE) {
      break;
    }
  }

  return merged;
}
