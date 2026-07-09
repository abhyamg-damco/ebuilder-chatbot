import { z } from "zod";
import { requireRegularSession } from "@/app/(auth)/auth";
import {
  getUserSettingsByUserId,
  upsertUserSettings,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import {
  DEFAULT_BROWSER_IDLE_TIMEOUT_SECONDS,
  MAX_BROWSER_IDLE_TIMEOUT_SECONDS,
  MIN_BROWSER_IDLE_TIMEOUT_SECONDS,
  normalizeBrowserIdleTimeoutSeconds,
} from "@/lib/settings/defaults";

const patchSettingsSchema = z.object({
  browserIdleTimeoutSeconds: z
    .number()
    .int()
    .min(MIN_BROWSER_IDLE_TIMEOUT_SECONDS)
    .max(MAX_BROWSER_IDLE_TIMEOUT_SECONDS),
});

function resolveBrowserIdleTimeoutSeconds(
  stored?: number | null
): number {
  if (stored == null) {
    return DEFAULT_BROWSER_IDLE_TIMEOUT_SECONDS;
  }

  return normalizeBrowserIdleTimeoutSeconds(stored);
}

/**
 * GET /api/settings
 *
 * Returns the current user's platform settings (defaults when unset).
 */
export async function GET() {
  const session = await requireRegularSession();

  if (!session?.user) {
    return new ChatbotError("unauthorized:api").toResponse();
  }

  const row = await getUserSettingsByUserId({ userId: session.user.id });

  return Response.json({
    browserIdleTimeoutSeconds: resolveBrowserIdleTimeoutSeconds(
      row?.browserIdleTimeoutSeconds
    ),
    limits: {
      minBrowserIdleTimeoutSeconds: MIN_BROWSER_IDLE_TIMEOUT_SECONDS,
      maxBrowserIdleTimeoutSeconds: MAX_BROWSER_IDLE_TIMEOUT_SECONDS,
      defaultBrowserIdleTimeoutSeconds: DEFAULT_BROWSER_IDLE_TIMEOUT_SECONDS,
    },
  });
}

/**
 * PATCH /api/settings
 *
 * Updates platform settings for the signed-in user.
 */
export async function PATCH(request: Request) {
  const session = await requireRegularSession();

  if (!session?.user) {
    return new ChatbotError("unauthorized:api").toResponse();
  }

  let body: z.infer<typeof patchSettingsSchema>;

  try {
    const json = await request.json();
    body = patchSettingsSchema.parse(json);
  } catch {
    return new ChatbotError("bad_request:api").toResponse();
  }

  const browserIdleTimeoutSeconds = normalizeBrowserIdleTimeoutSeconds(
    body.browserIdleTimeoutSeconds
  );

  const row = await upsertUserSettings({
    userId: session.user.id,
    browserIdleTimeoutSeconds,
  });

  return Response.json({
    browserIdleTimeoutSeconds: row.browserIdleTimeoutSeconds,
  });
}
