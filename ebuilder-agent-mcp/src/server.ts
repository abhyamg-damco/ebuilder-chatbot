import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppConfig } from "./config.js";
import { SERVER_NAME, SERVER_VERSION } from "./config.js";
import { EBuilderClient } from "./api/client.js";
import { getServerInstructions } from "./prompts/server-instructions.js";
import { registerDiscoverSchemaTools } from "./tools/discover-schema.js";
import { registerQueryRecordsTool } from "./tools/query-records.js";
import {
  registerGetRecordDetailTool,
  registerGetRecordsTool,
} from "./tools/get-records.js";
import {
  registerResolveCompanyTool,
  registerResolveProjectTool,
} from "./tools/resolve-entity.js";
import { registerQueryProcessesTool } from "./tools/query-processes.js";
import { registerAggregateRecordsTool } from "./tools/aggregate-records.js";
import { registerGetOriginalBudgetTool } from "./tools/get-original-budget.js";

/** Create and configure the e-Builder Construct MCP server with all tools. */
export function createEBuilderMcpServer(config: AppConfig): McpServer {
  const client = new EBuilderClient(config);

  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions: getServerInstructions(),
    }
  );

  registerDiscoverSchemaTools(server, client);
  registerQueryRecordsTool(server, client);
  registerGetRecordsTool(server, client);
  registerGetRecordDetailTool(server, client);
  registerResolveProjectTool(server, client);
  registerResolveCompanyTool(server, client);
  registerQueryProcessesTool(server, client);
  registerGetOriginalBudgetTool(server, client);
  registerAggregateRecordsTool(server);

  return server;
}
