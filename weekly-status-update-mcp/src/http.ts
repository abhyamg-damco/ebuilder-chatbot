#!/usr/bin/env node
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { loadConfig, SERVER_NAME } from "./config.js";
import { createWeeklyStatusServer } from "./server.js";

const config = loadConfig();
const app = createMcpExpressApp(config.allowedHosts.length ? { host: "0.0.0.0", allowedHosts: config.allowedHosts } : { host: "0.0.0.0" });

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
app.listen(config.port, "0.0.0.0", () => console.error(`${SERVER_NAME} listening on :${config.port}`));
