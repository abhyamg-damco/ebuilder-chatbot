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
  closeBrowserSession,
  getOrCreateBrowserSession,
} from "@/lib/browserbase/session-store";
import type { ChatMessage } from "@/lib/types";

/** Dependencies injected from the chat API route's stream execute callback. */
type CreateBrowserToolsProps = {
  /** Chat UUID — scopes the in-memory browser session. */
  chatId: string;
  /** SSE writer for pushing live-view events to BrowserPanel. */
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

/** Public replay URL shown in tool results and the panel header link. */
const sessionReplayUrl = (sessionId: string) =>
  `https://www.browserbase.com/sessions/${sessionId}`;

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
  dataStream,
}: CreateBrowserToolsProps) {
  const browserNavigate = tool({
    description:
      "Open or navigate the live cloud browser to a URL. Starts a browser session if one is not already active. The user can watch the live view on the right.",
    inputSchema: z.object({
      url: z.string().url().describe("URL to open in the cloud browser"),
    }),
    execute: async ({ url }) => {
      const { stagehand, sessionId, liveViewUrl } =
        await getOrCreateBrowserSession({
          chatId,
          dataStream,
          title: new URL(url).hostname,
        });

      const page = stagehand.context.pages()[0];

      if (!page) {
        throw new Error("No browser page available.");
      }

      await page.goto(url, { waitUntil: "domcontentloaded" });

      return {
        url,
        sessionId,
        sessionUrl: sessionReplayUrl(sessionId),
        liveViewUrl,
        pageTitle: await page.title(),
      };
    },
  });

  const browserAct = tool({
    description:
      "Perform a single browser action in natural language on the current page — click a button, fill a field, scroll, select a menu item, etc. Requires an active browser session (use browserNavigate first).",
    inputSchema: z.object({
      instruction: z
        .string()
        .describe(
          "Atomic action, e.g. 'click the Sign in button' or 'type john@example.com into the email field'"
        ),
    }),
    execute: async ({ instruction }) => {
      const { stagehand, sessionId, liveViewUrl } =
        await getOrCreateBrowserSession({ chatId, dataStream });

      // observe→act pattern: discover the element once, then replay without full LLM act().
      const observed = await stagehand.observe(instruction);
      const action = observed[0];

      if (!action) {
        return {
          success: false,
          message: `No matching element found for: ${instruction}`,
          sessionId,
          sessionUrl: sessionReplayUrl(sessionId),
          liveViewUrl,
        };
      }

      await stagehand.act(action);

      return {
        success: true,
        instruction,
        sessionId,
        sessionUrl: sessionReplayUrl(sessionId),
        liveViewUrl,
      };
    },
  });

  const browserExtract = tool({
    description:
      "Extract structured text data from the current browser page. Requires an active browser session.",
    inputSchema: z.object({
      instruction: z
        .string()
        .describe(
          "What to extract, e.g. 'extract all product names and prices on this page'"
        ),
    }),
    execute: async ({ instruction }) => {
      const { stagehand, sessionId, liveViewUrl } =
        await getOrCreateBrowserSession({ chatId, dataStream });

      const extracted = await stagehand.extract(
        instruction,
        z.object({
          data: z.string().describe("Extracted content as readable text or JSON"),
        })
      );

      return {
        instruction,
        extracted,
        sessionId,
        sessionUrl: sessionReplayUrl(sessionId),
        liveViewUrl,
      };
    },
  });

  const browserAgent = tool({
    description:
      "Run a multi-step browser agent on the current page for complex tasks — forms, uploads, multi-page flows. Keeps the session open so the user can watch live. Use browserNavigate first to set the starting URL.",
    inputSchema: z.object({
      instruction: z
        .string()
        .describe("Multi-step task for the browser agent"),
      maxSteps: z
        .number()
        .min(1)
        .max(BROWSER_AGENT_MAX_STEPS)
        .optional()
        .describe(`Maximum agent steps (default ${BROWSER_AGENT_MAX_STEPS})`),
    }),
    execute: async ({ instruction, maxSteps = BROWSER_AGENT_MAX_STEPS }) => {
      const { stagehand, sessionId, liveViewUrl } =
        await getOrCreateBrowserSession({ chatId, dataStream });

      const agent = stagehand.agent({
        systemPrompt:
          "You are a web automation assistant. Complete the user's task on the current page. Be precise with forms, navigation, and file uploads.",
      });

      const result = await agent.execute({ instruction, maxSteps });

      return {
        instruction,
        result,
        sessionId,
        sessionUrl: sessionReplayUrl(sessionId),
        liveViewUrl,
      };
    },
  });

  const closeBrowser = tool({
    description:
      "Close the active cloud browser session when browsing is complete.",
    inputSchema: z.object({}),
    execute: async () => {
      await closeBrowserSession({ chatId, dataStream });
      return { closed: true };
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
      const client = getBrowserbaseClient();
      const searchData = await client.search.web({ query, numResults: 5 });
      const result = searchData.results.at(resultIndex);

      if (!result) {
        throw new Error(`No search result at index ${resultIndex} for "${query}".`);
      }

      const { stagehand, sessionId, liveViewUrl } =
        await getOrCreateBrowserSession({
          chatId,
          dataStream,
          title: result.title,
        });

      const page = stagehand.context.pages()[0];

      if (!page) {
        throw new Error("No browser page available.");
      }

      await page.goto(result.url, { waitUntil: "domcontentloaded" });

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
        pageTitle: await page.title(),
      };
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
      const client = getBrowserbaseClient();
      const searchData = await client.search.web({ query, numResults: 5 });
      const result = searchData.results.at(resultIndex);

      if (!result) {
        throw new Error(`No search result at index ${resultIndex} for "${query}".`);
      }

      const { stagehand, sessionId, liveViewUrl } =
        await getOrCreateBrowserSession({
          chatId,
          dataStream,
          title: result.title,
        });

      const page = stagehand.context.pages()[0];

      if (!page) {
        throw new Error("No browser page available.");
      }

      await page.goto(result.url, { waitUntil: "domcontentloaded" });

      const extracted = await stagehand.extract(
        summarizeInstruction,
        z.object({
          data: z.string().describe("Summary or extracted content"),
        })
      );

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
    },
  });

  return {
    browserNavigate,
    browserSearchAndOpen,
    browserSearchOpenAndSummarize,
    browserAct,
    browserExtract,
    browserAgent,
    closeBrowser,
  };
}
