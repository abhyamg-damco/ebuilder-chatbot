/** Default browser idle timeout when the user has not changed platform settings. */
export const DEFAULT_BROWSER_IDLE_TIMEOUT_SECONDS = 120;

export const DEFAULT_BROWSER_IDLE_TIMEOUT_MS =
  DEFAULT_BROWSER_IDLE_TIMEOUT_SECONDS * 1000;

/** Minimum idle timeout (30 seconds). */
export const MIN_BROWSER_IDLE_TIMEOUT_SECONDS = 30;

/** Maximum idle timeout (30 minutes). */
export const MAX_BROWSER_IDLE_TIMEOUT_SECONDS = 1_800;

export type UserPlatformSettings = {
  browserIdleTimeoutSeconds: number;
};

export const defaultUserPlatformSettings: UserPlatformSettings = {
  browserIdleTimeoutSeconds: DEFAULT_BROWSER_IDLE_TIMEOUT_SECONDS,
};

/**
 * Clamps a browser idle timeout to the allowed platform range.
 */
export function normalizeBrowserIdleTimeoutSeconds(seconds: number): number {
  return Math.min(
    MAX_BROWSER_IDLE_TIMEOUT_SECONDS,
    Math.max(MIN_BROWSER_IDLE_TIMEOUT_SECONDS, Math.round(seconds))
  );
}

/**
 * Converts stored seconds to milliseconds for timers.
 */
export function browserIdleTimeoutToMs(seconds: number): number {
  return normalizeBrowserIdleTimeoutSeconds(seconds) * 1000;
}
