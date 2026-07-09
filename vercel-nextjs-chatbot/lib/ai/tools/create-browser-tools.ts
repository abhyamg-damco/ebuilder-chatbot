/**
 * @file Live browser AI tools factory
 *
 * Creates AI SDK tools that drive a shared Stagehand session per chat request.
 * Each tool that touches the browser calls getOrCreateBrowserSession, which:
 * - Starts a cloud Chrome session on first use
 * - Emits data-browserSession so BrowserPanel opens on the right
 * - Reuses the same session for subsequent tool calls in the same stream
 *
 * Tool tiers:
 * - Combined: browserSearchOpenAndSummarize, browserSearchAndOpen
 * - Navigation: browserNavigate
 * - Interaction: browserAct (observe→act), browserExtract, browserAgent
 * - Cleanup: closeBrowser
 *
 * @see docs/architecture/browserbase-integration.md
 * @see docs/decisions/004-browser-tool-tiering.md
 */
import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import { getBrowserbaseClient } from "@/lib/browserbase/client";
import { BROWSER_AGENT_MAX_STEPS } from "@/lib/browserbase/config";
import {
  attachFileToInput,
  syncUploadsToSession,
} from "@/lib/browserbase/session-uploads";
import {
  closeBrowserSession,
  getOrCreateBrowserSession,
} from "@/lib/browserbase/session-store";
import type { ActivityCollector } from "@/lib/chat/emit-agent-activity";
import {
  emitAgentActivity,
  markLastActiveAsDone,
  markLastActiveAsError,
} from "@/lib/chat/emit-agent-activity";
import {
  formatBrowserActMessage,
  formatBrowserAgentAction,
  formatBrowserAgentStart,
  formatBrowserAgentStep,
  formatBrowserAttachFileStart,
  formatBrowserExtractMessage,
  formatBrowserNavigateDone,
  formatBrowserNavigateStart,
  formatBrowserSearchOpenDone,
  formatBrowserSearchStart,
  formatBrowserSyncUploadsStart,
  formatCloseBrowserMessage,
} from "@/lib/chat/format-agent-activity";
import type { ChatUpload } from "@/lib/db/schema";
import {
  expandSecretsInText,
  redactSecretsInText,
} from "@/lib/secrets/expand";
import type { ActiveUserSecret } from "@/lib/secrets/types";
import type { ChatMessage } from "@/lib/types";

/** Dependencies injected from the chat API route's stream execute callback. */
type CreateBrowserToolsProps = {
  chatId: string;
  userId: string;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  chatUploadRecords: ChatUpload[];
  /** Resolved vault secrets for this turn — expanded into tool instructions. */
  activeSecrets?: ActiveUserSecret[];
  /** Collects activity events for persistence and live SSE streaming. */
  activityCollector: ActivityCollector;
};

/** Public replay URL shown in tool results and the panel header link. */
const sessionReplayUrl = (sessionId: string) =>
  `https://www.browserbase.com/sessions/${sessionId}`;

/** Reads current page URL and title so the agent can chain actions without asking the user. */
async function getPageState(stagehand: {
  context: { pages: () => Array<{ url: () => string; title: () => Promise<string> }> };
}) {
  const page = stagehand.context.pages()[0];

  if (!page) {
    return { pageUrl: undefined, pageTitle: undefined };
  }

  return {
    pageUrl: page.url(),
    pageTitle: await page.title(),
  };
}

const BROWSER_AGENT_SYSTEM_PROMPT = `You are an autonomous web automation agent. Complete the user's task on the current page without asking for confirmation at each step.

Rules:
- The instruction contains REAL credential values when provided — type those exact strings into form fields. Never type placeholder names like "trimble-username" or "@secret:…".
- Use credentials, account names, and values from the instruction — do not re-prompt for them.
- After each action, observe the page and continue to the next step automatically.
- For login flows: enter username → click Next/Continue → enter password → submit → handle MFA only if a code was provided.
- For wizards: click Next/Continue through each step until finished.
- For dropdowns: select the matching option, then confirm/continue.
- Only stop when the task is complete or you hit an unsolvable blocker (CAPTCHA, missing OTP).
- Be precise with forms, navigation, and file uploads.`;

/**
 * Builds the live-browser tool set for one chat stream invocation.
 *
 * Must be called inside createUIMessageStream.execute where dataStream is available.
 *
 * @param props - Chat ID and stream writer from the chat API route.
 * @returns Object of AI SDK tools to spread into streamText({ tools }).
 */
export function createBrowserTools({
  chatId,
  userId,
  dataStream,
  chatUploadRecords,
  activeSecrets = [],
  activityCollector,
}: CreateBrowserToolsProps) {
  /** Expand @secret:slug / bare vault slugs before Stagehand sees the text. */
  const withSecrets = (text: string) =>
    expandSecretsInText(text, activeSecrets);

  /** Keep real values out of tool results shown in chat. */
  const forTranscript = (text: string) =>
    redactSecretsInText(text, activeSecrets);

  const formatOptions = { redact: forTranscript };

  const emitBrowserActivity = (
    message: string,
    status: "active" | "done" | "error"
  ) => {
    emitAgentActivity(dataStream, activityCollector, {
      message,
      status,
      category: "browser",
    });
  };

  const browserNavigate = tool({
    description:
      "Open or navigate the live cloud browser to a URL. Starts a browser session if one is not already active. The user can watch the live view on the right.",
    inputSchema: z.object({
      url: z.string().url().describe("URL to open in the cloud browser"),
    }),
    execute: async ({ url }) => {
      const resolvedUrl = withSecrets(url);
      emitBrowserActivity(
        formatBrowserNavigateStart(resolvedUrl, formatOptions),
        "active"
      );

      try {
        const { stagehand, sessionId, liveViewUrl } =
          await getOrCreateBrowserSession({
            chatId,
            userId,
            dataStream,
            title: new URL(resolvedUrl).hostname,
            startedUrl: resolvedUrl,
          });

        const page = stagehand.context.pages()[0];

        if (!page) {
          throw new Error("No browser page available.");
        }

        await page.goto(resolvedUrl, { waitUntil: "domcontentloaded" });
        const pageTitle = await page.title();
        markLastActiveAsDone(activityCollector);
        emitBrowserActivity(formatBrowserNavigateDone(pageTitle), "done");

        return {
          url: resolvedUrl,
          sessionId,
          sessionUrl: sessionReplayUrl(sessionId),
          liveViewUrl,
          pageTitle,
        };
      } catch (error) {
        markLastActiveAsError(activityCollector);
        throw error;
      }
    },
  });

  const browserAct = tool({
    description:
      "Perform a single browser action in natural language on the current page — click a button, fill a field, scroll, select a menu item, etc. Returns pageUrl and pageTitle after the action so you can decide the next step without asking the user. Requires an active browser session (use browserNavigate first). Put REAL credential values in the instruction, never secret slug names.",
    inputSchema: z.object({
      instruction: z
        .string()
        .describe(
          "Atomic action with real values, e.g. 'click the Sign in button' or 'type john@example.com into the email field'"
        ),
    }),
    execute: async ({ instruction }) => {
      const resolvedInstruction = withSecrets(instruction);
      emitBrowserActivity(
        formatBrowserActMessage(resolvedInstruction, formatOptions),
        "active"
      );

      try {
        const { stagehand, sessionId, liveViewUrl } =
          await getOrCreateBrowserSession({ chatId, userId, dataStream });

        const observed = await stagehand.observe(resolvedInstruction);
        const action = observed[0];

        if (!action) {
          const pageState = await getPageState(stagehand);
          markLastActiveAsError(activityCollector);
          emitBrowserActivity("Could not find matching element on page", "error");

          return {
            success: false,
            message: `No matching element found for: ${forTranscript(resolvedInstruction)}`,
            sessionId,
            sessionUrl: sessionReplayUrl(sessionId),
            liveViewUrl,
            ...pageState,
          };
        }

        await stagehand.act(action);
        const pageState = await getPageState(stagehand);
        markLastActiveAsDone(activityCollector);
        emitBrowserActivity(
          pageState.pageTitle
            ? `Action complete on ${pageState.pageTitle}`
            : "Action complete",
          "done"
        );

        return {
          success: true,
          instruction: forTranscript(resolvedInstruction),
          sessionId,
          sessionUrl: sessionReplayUrl(sessionId),
          liveViewUrl,
          ...pageState,
        };
      } catch (error) {
        markLastActiveAsError(activityCollector);
        throw error;
      }
    },
  });

  const browserExtract = tool({
    description:
      "Extract structured text data from the current browser page. Use this to inspect wizard steps, visible form fields, error messages, and available buttons — then decide the next browserAct without asking the user. Requires an active browser session.",
    inputSchema: z.object({
      instruction: z
        .string()
        .describe(
          "What to extract, e.g. 'extract all product names and prices on this page'"
        ),
    }),
    execute: async ({ instruction }) => {
      const resolvedInstruction = withSecrets(instruction);
      emitBrowserActivity(
        formatBrowserExtractMessage(resolvedInstruction, formatOptions),
        "active"
      );

      try {
        const { stagehand, sessionId, liveViewUrl } =
          await getOrCreateBrowserSession({ chatId, userId, dataStream });

        const extracted = await stagehand.extract(
          resolvedInstruction,
          z.object({
            data: z.string().describe("Extracted content as readable text or JSON"),
          })
        );

        markLastActiveAsDone(activityCollector);
        emitBrowserActivity("Page content extracted", "done");

        return {
          instruction: forTranscript(resolvedInstruction),
          extracted,
          sessionId,
          sessionUrl: sessionReplayUrl(sessionId),
          liveViewUrl,
        };
      } catch (error) {
        markLastActiveAsError(activityCollector);
        throw error;
      }
    },
  });

  const browserAgent = tool({
    description:
      "Run a multi-step browser agent on the current page for complex tasks — login flows, forms, uploads, multi-page wizards. Executes many steps autonomously without asking the user to confirm each one. Use browserNavigate first to set the starting URL. Include REAL username/password/URL values in the instruction (never vault slug names).",
    inputSchema: z.object({
      instruction: z
        .string()
        .describe(
          "Complete multi-step task with all known REAL values (credentials, account names, project IDs, file paths). Never use placeholder slug names. The agent runs autonomously until done or blocked."
        ),
      maxSteps: z
        .number()
        .min(1)
        .max(BROWSER_AGENT_MAX_STEPS)
        .optional()
        .describe(`Maximum agent steps (default ${BROWSER_AGENT_MAX_STEPS})`),
    }),
    execute: async ({ instruction, maxSteps = BROWSER_AGENT_MAX_STEPS }) => {
      const resolvedInstruction = withSecrets(instruction);
      emitBrowserActivity(
        formatBrowserAgentStart(resolvedInstruction, formatOptions),
        "active"
      );

      try {
        const { stagehand, sessionId, liveViewUrl } =
          await getOrCreateBrowserSession({ chatId, userId, dataStream });

        const agent = stagehand.agent({
          systemPrompt: BROWSER_AGENT_SYSTEM_PROMPT,
        });

        const result = await agent.execute({
          instruction: resolvedInstruction,
          maxSteps,
          callbacks: {
            onStepFinish: async ({ toolCalls }) => {
              for (const call of toolCalls ?? []) {
                if (!call?.toolName) {
                  continue;
                }

                emitBrowserActivity(
                  formatBrowserAgentStep(
                    call.toolName,
                    call.input,
                    formatOptions
                  ),
                  "active"
                );
              }
            },
          },
        });

        if (result.actions?.length) {
          for (const action of result.actions) {
            const line = formatBrowserAgentAction(action);

            if (line) {
              emitBrowserActivity(line, "done");
            }
          }
        }

        const pageState = await getPageState(stagehand);
        markLastActiveAsDone(activityCollector);
        emitBrowserActivity(
          result.success ? "Automation finished" : "Automation stopped",
          result.success ? "done" : "error"
        );

        return {
          instruction: forTranscript(resolvedInstruction),
          result,
          sessionId,
          sessionUrl: sessionReplayUrl(sessionId),
          liveViewUrl,
          ...pageState,
        };
      } catch (error) {
        markLastActiveAsError(activityCollector);
        throw error;
      }
    },
  });

  const closeBrowser = tool({
    description:
      "Close the active cloud browser session when browsing is complete.",
    inputSchema: z.object({}),
    execute: async () => {
      emitBrowserActivity(formatCloseBrowserMessage(), "active");

      try {
        await closeBrowserSession({ chatId, dataStream });
        markLastActiveAsDone(activityCollector);
        emitBrowserActivity("Browser session closed", "done");
        return { closed: true };
      } catch (error) {
        markLastActiveAsError(activityCollector);
        throw error;
      }
    },
  });

  const browserSyncUploads = tool({
    description:
      "Sync user files marked 'Use in browser' from chat storage into the active Browserbase session. Call before browserAttachFile or form uploads. Returns remote paths inside the session.",
    inputSchema: z.object({
      uploadIds: z
        .array(z.string().uuid())
        .optional()
        .describe(
          "Specific upload IDs to sync. Omit to sync all browser-bound uploads for this chat."
        ),
    }),
    execute: async ({ uploadIds }) => {
      emitBrowserActivity(formatBrowserSyncUploadsStart(), "active");

      try {
        const activeSession = await getOrCreateBrowserSession({
          chatId,
          userId,
          dataStream,
          title: "File sync",
        });

        const syncResult = await syncUploadsToSession({
          session: activeSession,
          uploads: chatUploadRecords,
          uploadIds,
        });

        markLastActiveAsDone(activityCollector);
        emitBrowserActivity(
          syncResult.synced.length > 0
            ? `Synced ${syncResult.synced.length} file(s) to browser`
            : "File sync complete",
          "done"
        );

        return {
          ...syncResult,
          sessionId: activeSession.sessionId,
          sessionUrl: sessionReplayUrl(activeSession.sessionId),
          liveViewUrl: activeSession.liveViewUrl,
        };
      } catch (error) {
        markLastActiveAsError(activityCollector);
        throw error;
      }
    },
  });

  const browserAttachFile = tool({
    description:
      "Attach a user-uploaded file (marked for browser use) to a file input on the current page. Syncs the file into the session if needed, then sets it on the given CSS selector.",
    inputSchema: z.object({
      uploadId: z
        .string()
        .uuid()
        .describe("Chat upload ID from getChatUploads"),
      selector: z
        .string()
        .describe("CSS selector for the file input, e.g. #fileUpload"),
      description: z
        .string()
        .optional()
        .describe("Optional note for the tool result"),
    }),
    execute: async ({ uploadId, selector, description }) => {
      emitBrowserActivity(formatBrowserAttachFileStart(selector), "active");

      try {
        const activeSession = await getOrCreateBrowserSession({
          chatId,
          userId,
          dataStream,
          title: "Attach file",
        });

        const syncResult = await syncUploadsToSession({
          session: activeSession,
          uploads: chatUploadRecords,
          uploadIds: [uploadId],
        });

        if (syncResult.errors.length > 0) {
          markLastActiveAsError(activityCollector);
          emitBrowserActivity("Failed to sync file for upload", "error");

          return {
            success: false,
            message: syncResult.errors.at(0)?.error ?? "Failed to sync file",
            syncResult,
            sessionId: activeSession.sessionId,
            sessionUrl: sessionReplayUrl(activeSession.sessionId),
            liveViewUrl: activeSession.liveViewUrl,
          };
        }

        const syncedEntry = activeSession.syncedFiles.get(uploadId);
        const remotePath =
          syncedEntry?.remotePath ??
          syncResult.synced.find((item) => item.uploadId === uploadId)?.remotePath;

        if (!remotePath) {
          markLastActiveAsError(activityCollector);
          emitBrowserActivity("File not available for browser upload", "error");

          return {
            success: false,
            message:
              "File not found or not marked for browser use. Ask the user to check 'Use in browser' when attaching.",
            sessionId: activeSession.sessionId,
            sessionUrl: sessionReplayUrl(activeSession.sessionId),
            liveViewUrl: activeSession.liveViewUrl,
          };
        }

        const page = activeSession.stagehand.context.pages()[0];

        if (!page) {
          throw new Error("No browser page available.");
        }

        try {
          await attachFileToInput({
            page,
            remotePath,
            selector,
          });
        } catch (error) {
          markLastActiveAsError(activityCollector);
          emitBrowserActivity("Failed to attach file to input", "error");

          return {
            success: false,
            message:
              error instanceof Error
                ? error.message
                : "Failed to attach file to input",
            remotePath,
            selector,
            syncResult,
            sessionId: activeSession.sessionId,
            sessionUrl: sessionReplayUrl(activeSession.sessionId),
            liveViewUrl: activeSession.liveViewUrl,
          };
        }

        markLastActiveAsDone(activityCollector);
        emitBrowserActivity("File attached to form", "done");

        return {
          success: true,
          uploadId,
          selector,
          remotePath,
          description,
          pageUrl: page.url(),
          syncResult,
          sessionId: activeSession.sessionId,
          sessionUrl: sessionReplayUrl(activeSession.sessionId),
          liveViewUrl: activeSession.liveViewUrl,
        };
      } catch (error) {
        markLastActiveAsError(activityCollector);
        throw error;
      }
    },
  });

  const browserSearchAndOpen = tool({
    description:
      "Search the web, then open a result in the LIVE cloud browser (right-hand panel). Use when the user asks to search and open a page. Do NOT use fetchWebPage instead.",
    inputSchema: z.object({
      query: z.string().describe("Search query"),
      resultIndex: z
        .number()
        .min(0)
        .max(4)
        .optional()
        .describe("Which search result to open (0 = first, default 0)"),
    }),
    execute: async ({ query, resultIndex = 0 }) => {
      emitBrowserActivity(formatBrowserSearchStart(query), "active");

      try {
        const client = getBrowserbaseClient();
        const searchData = await client.search.web({ query, numResults: 5 });
        const result = searchData.results.at(resultIndex);

        if (!result) {
          markLastActiveAsError(activityCollector);
          throw new Error(`No search result at index ${resultIndex} for "${query}".`);
        }

        const { stagehand, sessionId, liveViewUrl } =
          await getOrCreateBrowserSession({
            chatId,
            userId,
            dataStream,
            title: result.title,
            startedUrl: result.url,
          });

        const page = stagehand.context.pages()[0];

        if (!page) {
          throw new Error("No browser page available.");
        }

        await page.goto(result.url, { waitUntil: "domcontentloaded" });
        const pageTitle = await page.title();
        markLastActiveAsDone(activityCollector);
        emitBrowserActivity(formatBrowserSearchOpenDone(pageTitle), "done");

        return {
          query,
          opened: {
            title: result.title,
            url: result.url,
            rank: resultIndex + 1,
          },
          sessionId,
          sessionUrl: sessionReplayUrl(sessionId),
          liveViewUrl,
          pageTitle,
        };
      } catch (error) {
        markLastActiveAsError(activityCollector);
        throw error;
      }
    },
  });

  const browserSearchOpenAndSummarize = tool({
    description:
      "Search the web, open the top result in the LIVE browser panel, and extract a summary from that page. REQUIRED when the user asks to search, open a link, and summarize — never use webSearch + fetchWebPage for that pattern.",
    inputSchema: z.object({
      query: z.string().describe("Search query"),
      summarizeInstruction: z
        .string()
        .describe("What to extract or summarize from the opened page"),
      resultIndex: z
        .number()
        .min(0)
        .max(4)
        .optional()
        .describe("Which search result to open (0 = first, default 0)"),
    }),
    execute: async ({ query, summarizeInstruction, resultIndex = 0 }) => {
      emitBrowserActivity(formatBrowserSearchStart(query), "active");

      try {
        const client = getBrowserbaseClient();
        const searchData = await client.search.web({ query, numResults: 5 });
        const result = searchData.results.at(resultIndex);

        if (!result) {
          markLastActiveAsError(activityCollector);
          throw new Error(`No search result at index ${resultIndex} for "${query}".`);
        }

        const { stagehand, sessionId, liveViewUrl } =
          await getOrCreateBrowserSession({
            chatId,
            userId,
            dataStream,
            title: result.title,
            startedUrl: result.url,
          });

        const page = stagehand.context.pages()[0];

        if (!page) {
          throw new Error("No browser page available.");
        }

        await page.goto(result.url, { waitUntil: "domcontentloaded" });
        emitBrowserActivity(formatBrowserSearchOpenDone(result.title), "done");
        emitBrowserActivity(
          formatBrowserExtractMessage(summarizeInstruction, formatOptions),
          "active"
        );

        const extracted = await stagehand.extract(
          summarizeInstruction,
          z.object({
            data: z.string().describe("Summary or extracted content"),
          })
        );

        markLastActiveAsDone(activityCollector);
        emitBrowserActivity("Summary extracted from page", "done");

        return {
          query,
          opened: {
            title: result.title,
            url: result.url,
            rank: resultIndex + 1,
          },
          summary: extracted,
          sessionId,
          sessionUrl: sessionReplayUrl(sessionId),
          liveViewUrl,
        };
      } catch (error) {
        markLastActiveAsError(activityCollector);
        throw error;
      }
    },
  });

  return {
    browserNavigate,
    browserSearchAndOpen,
    browserSearchOpenAndSummarize,
    browserAct,
    browserExtract,
    browserAgent,
    browserSyncUploads,
    browserAttachFile,
    closeBrowser,
  };
}
