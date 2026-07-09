import "server-only";

import { getUserSettingsByUserId } from "@/lib/db/queries";
import {
  browserIdleTimeoutToMs,
  DEFAULT_BROWSER_IDLE_TIMEOUT_SECONDS,
} from "./defaults";

/**
 * Resolves the browser idle timeout for a user in milliseconds.
 */
export async function getBrowserIdleTimeoutMs(
  userId: string
): Promise<number> {
  const settings = await getUserSettingsByUserId({ userId });
  const seconds =
    settings?.browserIdleTimeoutSeconds ?? DEFAULT_BROWSER_IDLE_TIMEOUT_SECONDS;
  return browserIdleTimeoutToMs(seconds);
}
