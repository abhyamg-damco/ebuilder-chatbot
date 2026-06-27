import "server-only";

import type { MCPClient } from "@ai-sdk/mcp";
import type { ToolSet } from "ai";
import type { UserType } from "@/app/(auth)/auth";
import { getEnabledMcpServers } from "@/lib/db/queries";
import { createMcpClientFromConfig } from "./client";
import { getMcpServerScope } from "./scope";
import { namespaceMcpToolName } from "./utils";

export type LoadedMcpTools = {
  tools: ToolSet;
  toolNames: string[];
  clients: MCPClient[];
  /** Server-specific usage instructions for the system prompt. */
  instructions: string[];
};

/**
 * Connect to all enabled MCP servers for the current session and convert their
 * tools into AI SDK-compatible tools with namespaced identifiers.
 * Guest visitors load the shared global configuration.
 */
export async function loadMcpToolsForUser(
  userId: string,
  userType: UserType
): Promise<LoadedMcpTools> {
  const scope = getMcpServerScope(userType, userId);
  const servers = await getEnabledMcpServers({ scope });
  const tools: ToolSet = {};
  const toolNames: string[] = [];
  const clients: MCPClient[] = [];
  const instructions: string[] = [];

  for (const server of servers) {
    try {
      const client = await createMcpClientFromConfig(server);
      clients.push(client);

      const serverTools = await client.tools();

      for (const [toolName, toolDef] of Object.entries(serverTools)) {
        const namespaced = namespaceMcpToolName(server.id, toolName);
        tools[namespaced] = toolDef as ToolSet[string];
        toolNames.push(namespaced);
      }

      if (client.instructions) {
        instructions.push(
          `MCP server "${server.name}": ${client.instructions}`
        );
      }
    } catch (error) {
      console.error(
        `Failed to load MCP server "${server.name}" (${server.id}):`,
        error
      );
    }
  }

  return { tools, toolNames, clients, instructions };
}

/** Close all MCP clients opened during a chat request. */
export async function closeMcpClients(clients: MCPClient[]): Promise<void> {
  await Promise.allSettled(clients.map((client) => client.close()));
}
