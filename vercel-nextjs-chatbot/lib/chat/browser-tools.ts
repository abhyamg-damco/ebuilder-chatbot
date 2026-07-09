/** Live-browser tool names that operate on a shared cloud session. */
export const LIVE_BROWSER_TOOL_NAMES = new Set([
  "browserNavigate",
  "browserSearchAndOpen",
  "browserSearchOpenAndSummarize",
  "browserAct",
  "browserExtract",
  "browserAgent",
  "browserSyncUploads",
  "browserAttachFile",
]);

/** Tool that fully ends the cloud browser session. */
export const CLOSE_BROWSER_TOOL_NAME = "closeBrowser";

export type BrowserToolSessionInfo = {
  sessionId: string;
  liveViewUrl?: string;
  title: string;
};

type BrowserToolOutput = {
  sessionId?: string;
  liveViewUrl?: string;
  url?: string;
  pageTitle?: string;
  opened?: { title?: string; url?: string };
};

/**
 * Whether a tool name belongs to the live-browser tool family.
 */
export function isLiveBrowserTool(toolName: string): boolean {
  return LIVE_BROWSER_TOOL_NAMES.has(toolName);
}

/**
 * Extracts session metadata from a completed browser tool result.
 */
export function getBrowserSessionFromToolOutput(
  toolName: string,
  output: unknown
): BrowserToolSessionInfo | null {
  if (toolName === CLOSE_BROWSER_TOOL_NAME || !output || typeof output !== "object") {
    return null;
  }

  const result = output as BrowserToolOutput;

  if (!result.sessionId) {
    return null;
  }

  const title =
    result.opened?.title ??
    result.pageTitle ??
    hostnameFromUrl(result.opened?.url ?? result.url) ??
    "Live browser";

  return {
    sessionId: result.sessionId,
    liveViewUrl: result.liveViewUrl,
    title,
  };
}

function hostnameFromUrl(url?: string): string | undefined {
  if (!url) {
    return undefined;
  }

  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}
