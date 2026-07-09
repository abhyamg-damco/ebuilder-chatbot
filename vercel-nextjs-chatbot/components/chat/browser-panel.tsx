/**
 * @file Browser panel UI component
 *
 * Renders the right-hand 60% column with an embedded Browserbase live-view iframe.
 * Takes priority over the artifact panel while a browser session is visible.
 *
 * Data flow:
 * session-store → data-browserSession SSE → DataStreamHandler → useBrowserPanel → this component
 *
 * @see docs/architecture/browserbase-integration.md
 * @see docs/decisions/003-live-browser-panel.md
 */
"use client";

import { ExternalLink, Monitor, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  initialBrowserPanelData,
  useBrowserPanel,
  useBrowserPanelSelector,
} from "@/hooks/use-browser-panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Live cloud browser panel — embeds Browserbase debuggerFullscreenUrl in an iframe.
 * Opens automatically when the agent calls a live-browser tool.
 */
export function BrowserPanel({ chatId }: { chatId: string }) {
  const isVisible = useBrowserPanelSelector((state) => state.isVisible);
  const sessionId = useBrowserPanelSelector((state) => state.sessionId);
  const liveViewUrl = useBrowserPanelSelector((state) => state.liveViewUrl);
  const title = useBrowserPanelSelector((state) => state.title);
  const status = useBrowserPanelSelector((state) => state.status);
  const { setBrowserPanel } = useBrowserPanel();

  // Local iframe URL may be populated async (poll fallback if stream omitted liveViewUrl).
  const [iframeUrl, setIframeUrl] = useState<string | null>(liveViewUrl);
  const [disconnected, setDisconnected] = useState(false);

  /**
   * Fetches a fresh embed URL — used on initial load and after transient disconnects
   * while the cloud session is still alive (agent paused for OTP / user input).
   */
  const refreshLiveView = useCallback(async () => {
    if (!sessionId) {
      return false;
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/browserbase/live-view?sessionId=${encodeURIComponent(sessionId)}&chatId=${encodeURIComponent(chatId)}`
    );

    if (!response.ok) {
      return false;
    }

    const data = (await response.json()) as { debuggerFullscreenUrl?: string };

    if (data.debuggerFullscreenUrl) {
      setIframeUrl(data.debuggerFullscreenUrl);
      setDisconnected(false);
      return true;
    }

    return false;
  }, [sessionId, chatId]);

  useEffect(() => {
    setIframeUrl(liveViewUrl);
    setDisconnected(false);
  }, [liveViewUrl]);

  /**
   * Fallback: poll GET /api/browserbase/live-view until the embed URL is ready.
   * Normally liveViewUrl arrives via the SSE stream; this handles race conditions.
   */
  useEffect(() => {
    if (!sessionId || liveViewUrl || status !== "running") {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      if (cancelled) {
        return;
      }
      await refreshLiveView();
    };

    const interval = setInterval(() => {
      void poll();
    }, 1_500);

    void poll();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sessionId, liveViewUrl, status, refreshLiveView]);

  /** Browserbase iframe posts this when the debugger disconnects. */
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data !== "browserbase-disconnected") {
        return;
      }

      setDisconnected(true);

      // Agent may have paused for chat input — session stays alive with keepAlive.
      if (status === "running" && sessionId) {
        const retryDelays = [500, 1_500, 3_000];
        for (const delay of retryDelays) {
          setTimeout(() => {
            void refreshLiveView();
          }, delay);
        }
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [status, sessionId, refreshLiveView]);

  const handleClose = useCallback(() => {
    setBrowserPanel((current) => ({
      ...current,
      isVisible: false,
    }));
  }, [setBrowserPanel]);

  // Keep a zero-width placeholder when hidden so shell width transitions stay smooth.
  if (!isVisible) {
    return (
      <div
        aria-hidden
        className="h-dvh w-0 shrink-0 overflow-hidden border-l border-transparent"
      />
    );
  }

  const replayUrl = sessionId
    ? `https://www.browserbase.com/sessions/${sessionId}`
    : null;

  return (
    <div className="flex h-dvh w-[60%] shrink-0 flex-col overflow-hidden border-l border-border/50 bg-sidebar">
      <div className="flex items-center justify-between gap-2 border-b border-border/50 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Monitor className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate font-medium text-sm">{title}</p>
            <p className="text-muted-foreground text-xs">
              {status === "running" && !disconnected
                ? "Live — agent is browsing"
                : status === "running" && disconnected
                  ? "Paused — enter details in chat or use the browser"
                  : "Session ended"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {replayUrl ? (
            <Button asChild size="sm" type="button" variant="ghost">
              <a href={replayUrl} rel="noopener noreferrer" target="_blank">
                <ExternalLink className="size-4" />
                <span className="sr-only">Open session replay</span>
              </a>
            </Button>
          ) : null}
          <Button onClick={handleClose} size="sm" type="button" variant="ghost">
            <X className="size-4" />
            <span className="sr-only">Close browser panel</span>
          </Button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 bg-black">
        {iframeUrl && status === "running" && !disconnected ? (
          <iframe
            allow="clipboard-read; clipboard-write"
            className="size-full border-0"
            sandbox="allow-same-origin allow-scripts"
            src={iframeUrl}
            title={`Live browser session ${sessionId ?? ""}`}
          />
        ) : (
          <div
            className={cn(
              "flex size-full flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground"
            )}
          >
            <Monitor className="size-8 opacity-50" />
            <p className="text-sm">
              {status === "ended"
                ? "Browser session ended."
                : disconnected
                  ? "Reconnecting to browser…"
                  : "Starting cloud browser…"}
            </p>
            {status === "running" && disconnected ? (
              <Button
                onClick={() => {
                  void refreshLiveView();
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                Reconnect live view
              </Button>
            ) : null}
            {replayUrl ? (
              <Button asChild size="sm" type="button" variant="outline">
                <a href={replayUrl} rel="noopener noreferrer" target="_blank">
                  Watch replay
                </a>
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export { initialBrowserPanelData };
