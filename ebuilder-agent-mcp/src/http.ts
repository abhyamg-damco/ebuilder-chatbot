#!/usr/bin/env node
/**
 * Streamable HTTP transport for deployable remote MCP access.
 */
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { loadConfig } from "./config.js";
import { createEBuilderMcpServer } from "./server.js";

const config = loadConfig();
const app = createMcpExpressApp();

/** Optional bearer auth for the MCP HTTP endpoint. */
function isAuthorized(authHeader: string | undefined): boolean {
  if (!config.mcpApiKey) {
    return true;
  }
  if (!authHeader?.startsWith("Bearer ")) {
    return false;
  }
  return authHeader.slice("Bearer ".length) === config.mcpApiKey;
}

app.use("/mcp", (req, res, next) => {
  if (!isAuthorized(req.headers.authorization)) {
    res.status(401).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Unauthorized" },
      id: null,
    });
    return;
  }
  next();
});

app.post("/mcp", async (req, res) => {
  const server = createEBuilderMcpServer(config);

  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);

    res.on("close", () => {
      transport.close().catch(() => undefined);
      server.close().catch(() => undefined);
    });
  } catch (error) {
    console.error("MCP HTTP error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", server: "ebuilder-construct-agent-mcp" });
});

const port = config.port;
app.listen(port, () => {
  console.error(
    `eBuilder Construct Agent MCP (HTTP) listening on http://0.0.0.0:${port}/mcp`
  );
});

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
