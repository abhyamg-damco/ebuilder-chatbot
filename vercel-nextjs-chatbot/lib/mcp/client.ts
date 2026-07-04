import "server-only";

import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { McpServer } from "@/lib/db/schema";
import type { McpServerTestResult, McpTransportType } from "./types";
import { normalizeStdioConfig, resolveHeadersWithEnv } from "./utils";

type McpServerConfig = Pick<
  McpServer,
  "transport" | "url" | "command" | "args" | "env" | "headers" | "name"
>;

function buildTransport(config: McpServerConfig) {
  const transport = config.transport as McpTransportType;
  const env = config.env ?? {};
  const headers = resolveHeadersWithEnv(config.headers ?? {}, env);

  if (transport === "http") {
    if (!config.url) {
      throw new Error("HTTP transport requires a URL");
    }

    return {
      type: "http" as const,
      url: config.url,
      headers,
    };
  }

  if (transport === "sse") {
    if (!config.url) {
      throw new Error("SSE transport requires a URL");
    }

    return {
      type: "sse" as const,
      url: config.url,
      headers,
    };
  }

  if (transport === "stdio") {
    if (!config.command) {
      throw new Error("Stdio transport requires a command");
    }

    const { command, args } = normalizeStdioConfig(
      config.command,
      config.args ?? []
    );

    return new StdioClientTransport({
      command,
      args,
      env: {
        ...process.env,
        ...(config.env ?? {}),
      } as Record<string, string>,
    });
  }

  throw new Error(`Unsupported MCP transport: ${transport}`);
}

/** Create an MCP client from a persisted server configuration. */
export async function createMcpClientFromConfig(
  config: McpServerConfig
): Promise<MCPClient> {
  return createMCPClient({
    transport: buildTransport(config),
    clientName: `chatbot-mcp-${config.name}`,
    onUncaughtError: (error) => {
      // Some MCP servers (e.g. server-everything) send notifications the SDK
      // does not handle yet — safe to ignore during normal operation.
      if (
        error instanceof Error &&
        error.message === "Unsupported message type"
      ) {
        return;
      }

      console.error(`MCP client error (${config.name}):`, error);
    },
  });
}

/** List all tools from an MCP client, following pagination cursors. */
async function listAllMcpTools(client: MCPClient) {
  const tools: Array<{ name: string; description?: string }> = [];
  let cursor: string | undefined;

  do {
    const page = await client.listTools({
      params: cursor ? { cursor } : undefined,
    });

    for (const tool of page.tools) {
      tools.push({
        name: tool.name,
        description: tool.description,
      });
    }

    cursor = page.nextCursor;
  } while (cursor);

  return tools;
}

/** Test connectivity to an MCP server and list available tools. */
export async function testMcpServerConnection(
  config: McpServerConfig
): Promise<McpServerTestResult> {
  let client: MCPClient | undefined;

  try {
    client = await createMcpClientFromConfig(config);
    const tools = await listAllMcpTools(client);

    return {
      success: true,
      serverInfo: {
        name: client.serverInfo.name,
        version: client.serverInfo.version,
      },
      toolCount: tools.length,
      tools,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to connect to MCP server",
      checkedAt: new Date().toISOString(),
    };
  } finally {
    await client?.close();
  }
}
