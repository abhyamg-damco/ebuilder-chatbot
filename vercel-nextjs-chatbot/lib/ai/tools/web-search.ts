/**
 * @file Browserbase Search tool (no live browser)
 *
 * Tier-1 discovery tool — returns URLs and snippets without starting a browser.
 * Use before live-browser tools when the agent needs to find pages first.
 *
 * @see docs/decisions/004-browser-tool-tiering.md
 */
import { tool } from "ai";
import { z } from "zod";
import { getBrowserbaseClient } from "@/lib/browserbase/client";

/**
 * AI SDK tool: search the web via Browserbase Search API.
 * Does NOT open the live browser panel — pair with browserNavigate for that.
 */
export const webSearch = tool({
  description:
    "Search the web for URLs and snippets. Does NOT open the live browser — follow with browserNavigate, browserSearchAndOpen, or browserSearchOpenAndSummarize when the user wants to open a page.",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
    numResults: z
      .number()
      .min(1)
      .max(10)
      .optional()
      .describe("Number of results to return (default 5)"),
  }),
  execute: async ({ query, numResults = 5 }) => {
    const client = getBrowserbaseClient();

    const searchData = await client.search.web({
      query,
      numResults,
    });

    return {
      query,
      results: searchData.results.map((result, index) => ({
        rank: index + 1,
        title: result.title,
        url: result.url,
        publishedDate: result.publishedDate ?? null,
      })),
    };
  },
});
