#!/usr/bin/env node
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { loadConfig, SERVER_NAME } from "./config.js";
import { createWeeklyStatusServer } from "./server.js";
import { logEvent } from "./logger.js";

const config = loadConfig();
const app = createMcpExpressApp({ host: "0.0.0.0" });

app.use((req, res, next) => {
  const startedAt = Date.now();
  // Log a Vapi call ID when present, but never log Authorization or request bodies.
  const callId = req.header("x-call-id");
  res.once("finish", () => logEvent("info", "http_request_completed", {
    method: req.method, path: req.path, status: res.statusCode, durationMs: Date.now() - startedAt,
    ...(callId ? { vapiCallId: callId } : {}),
  }));
  next();
});

app.use((req, res, next) => {
  if (!config.allowedHosts.length || config.allowedHosts.includes(req.hostname)) return next();
  res.status(403).json({ jsonrpc: "2.0", error: { code: -32000, message: "Invalid Host header" }, id: null });
});

app.use("/mcp", (req, res, next) => {
  if (config.mcpApiKey && req.headers.authorization !== `Bearer ${config.mcpApiKey}`) {
    res.status(401).json({ jsonrpc: "2.0", error: { code: -32001, message: "Unauthorized" }, id: null });
    return;
  }
  next();
});
app.post("/mcp", async (req, res) => {
  const server = createWeeklyStatusServer(config);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.once("close", () => { void transport.close(); void server.close(); });
  } catch (error) {
    console.error("MCP request failed", error);
    if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
  }
});
app.get("/health", (_req, res) => res.json({ status: "ok", server: SERVER_NAME, writesEnabled: config.writesEnabled }));
app.listen(config.port, "0.0.0.0", () => logEvent("info", "mcp_server_started", {
  server: SERVER_NAME, port: config.port, writesEnabled: config.writesEnabled,
  hostRestrictionEnabled: config.allowedHosts.length > 0, mcpApiKeyEnabled: Boolean(config.mcpApiKey),
}));
