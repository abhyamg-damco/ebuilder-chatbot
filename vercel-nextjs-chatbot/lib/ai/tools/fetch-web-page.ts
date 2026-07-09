/**
 * @file Browserbase Fetch tool (no live browser)
 *
 * Tier-1 read-only tool — fetches page HTML in the background.
 * Must NOT be used when the user asked to "open" or "watch" a page;
 * those requests require live-browser tools that open the right-hand panel.
 *
 * @see docs/decisions/004-browser-tool-tiering.md
 */
import { tool } from "ai";
import { z } from "zod";
import { getBrowserbaseClient } from "@/lib/browserbase/client";

/** Cap returned text to keep tool outputs token-efficient. */
const MAX_CONTENT_CHARS = 12_000;

/**
 * Strips HTML tags and collapses whitespace for LLM-friendly plain text.
 *
 * @param html - Raw HTML from Browserbase Fetch.
 * @param maxChars - Maximum characters to return.
 */
function htmlToTextPreview(html: string, maxChars: number): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxChars);
}

/**
 * AI SDK tool: silently fetch a URL's text content.
 * Does NOT start a cloud browser or open the live-view panel.
 */
export const fetchWebPage = tool({
  description:
    "Fetch page text silently in the background. Does NOT open the live browser panel. NEVER use when the user asked to open, browse, visit, or watch a page — use browserNavigate or browserSearchAndOpen instead.",
  inputSchema: z.object({
    url: z.string().url().describe("The page URL to fetch"),
  }),
  execute: async ({ url }) => {
    const client = getBrowserbaseClient();

    const fetchResult = await client.fetchAPI.create({
      url,
      allowRedirects: true,
    });

    const rawContent =
      typeof fetchResult.content === "string"
        ? fetchResult.content
        : JSON.stringify(fetchResult.content);

    const textContent = htmlToTextPreview(rawContent, MAX_CONTENT_CHARS);

    return {
      url,
      statusCode: fetchResult.statusCode,
      contentType: fetchResult.contentType,
      contentLength: rawContent.length,
      textPreview: textContent,
      truncated: rawContent.length > MAX_CONTENT_CHARS,
    };
  },
});
