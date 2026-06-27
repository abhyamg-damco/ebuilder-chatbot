#!/usr/bin/env node
/**
 * Stdio transport entry point for local development and chatbot stdio registration.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createEBuilderMcpServer } from "./server.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const server = createEBuilderMcpServer(config);
  const transport = new StdioServerTransport();

  await server.connect(transport);

  const shutdown = async () => {
    await server.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
