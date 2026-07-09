/**
 * Smoke-test Browserbase Search and Fetch (no Stagehand).
 * Run: pnpm exec tsx scripts/verify-browserbase.ts
 */
import { config } from "dotenv";

config();

import { Browserbase } from "@browserbasehq/sdk";
import { getBrowserbaseApiKey } from "../lib/browserbase/config";

async function main() {
  const apiKey = getBrowserbaseApiKey();

  if (!apiKey) {
    throw new Error("Set BROWSERBASE_API_KEY in .env or the environment.");
  }

  const client = new Browserbase({ apiKey });
  const query = "Browserbase cloud browsers";

  console.log("\n1. Search");
  const searchData = await client.search.web({ query, numResults: 3 });

  for (const [index, result] of searchData.results.entries()) {
    console.log(`   ${index + 1}. ${result.title} — ${result.url}`);
  }

  const topUrl = searchData.results[0]?.url;

  if (!topUrl) {
    throw new Error("No search results returned.");
  }

  console.log("\n2. Fetch");
  const fetchResult = await client.fetchAPI.create({
    url: topUrl,
    allowRedirects: true,
  });

  console.log(`   ${topUrl} → HTTP ${fetchResult.statusCode}`);
  console.log(`   Content length: ${fetchResult.content.length} chars`);
  console.log("\nSearch + Fetch OK.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
