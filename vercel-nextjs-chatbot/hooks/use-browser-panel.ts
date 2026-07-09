/**
 * @file Browser panel client state (SWR)
 *
 * Mirrors the artifact panel pattern (hooks/use-artifact.ts) but for the
 * live Browserbase session view. State is global within the chat layout
 * via SWR key "browser-panel" — not persisted to the database.
 *
 * Updated by DataStreamHandler when it receives data-browserSession events
 * from the chat API stream.
 *
 * @see docs/decisions/003-live-browser-panel.md
 */
"use client";

import { useCallback, useMemo } from "react";
import useSWR from "swr";

/** Lifecycle state of the cloud browser shown in the panel. */
export type BrowserPanelStatus = "idle" | "running" | "ended";

/** UI state for the right-hand live browser panel. */
export type BrowserPanelState = {
  sessionId: string | null;
  liveViewUrl: string | null;
  title: string;
  status: BrowserPanelStatus;
  isVisible: boolean;
};

/** Default state — panel hidden until a browser session starts. */
export const initialBrowserPanelData: BrowserPanelState = {
  sessionId: null,
  liveViewUrl: null,
  title: "Live browser",
  status: "idle",
  isVisible: false,
};

type Selector<T> = (state: BrowserPanelState) => T;

/**
 * Subscribes to a slice of browser panel state (same pattern as useArtifactSelector).
 *
 * @param selector - Function that picks one field or derived value from panel state.
 */
export function useBrowserPanelSelector<Selected>(selector: Selector<Selected>) {
  const { data } = useSWR<BrowserPanelState>("browser-panel", null, {
    fallbackData: initialBrowserPanelData,
  });

  return useMemo(() => selector(data ?? initialBrowserPanelData), [data, selector]);
}

/**
 * Read/write hook for the browser panel SWR store.
 *
 * @returns Current panel state and setBrowserPanel updater.
 */
export function useBrowserPanel() {
  const { data, mutate } = useSWR<BrowserPanelState>("browser-panel", null, {
    fallbackData: initialBrowserPanelData,
  });

  const panel = data ?? initialBrowserPanelData;

  const setBrowserPanel = useCallback(
    (
      updater:
        | BrowserPanelState
        | ((current: BrowserPanelState) => BrowserPanelState)
    ) => {
      mutate((current) => {
        const base = current ?? initialBrowserPanelData;
        return typeof updater === "function" ? updater(base) : updater;
      });
    },
    [mutate]
  );

  return useMemo(
    () => ({
      panel,
      setBrowserPanel,
    }),
    [panel, setBrowserPanel]
  );
}
