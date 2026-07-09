"use client";

import useSWR from "swr";
import {
  browserIdleTimeoutToMs,
  DEFAULT_BROWSER_IDLE_TIMEOUT_SECONDS,
} from "@/lib/settings/defaults";
import { fetcher } from "@/lib/utils";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export type UserSettingsResponse = {
  browserIdleTimeoutSeconds: number;
  limits?: {
    minBrowserIdleTimeoutSeconds: number;
    maxBrowserIdleTimeoutSeconds: number;
    defaultBrowserIdleTimeoutSeconds: number;
  };
};

/**
 * Loads per-user platform settings for client timers and UI.
 */
export function useUserSettings(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<UserSettingsResponse>(
    enabled ? `${basePath}/api/settings` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const browserIdleTimeoutSeconds =
    data?.browserIdleTimeoutSeconds ?? DEFAULT_BROWSER_IDLE_TIMEOUT_SECONDS;

  return {
    settings: data,
    browserIdleTimeoutSeconds,
    browserIdleTimeoutMs: browserIdleTimeoutToMs(browserIdleTimeoutSeconds),
    isLoading,
    error,
    mutate,
  };
}
