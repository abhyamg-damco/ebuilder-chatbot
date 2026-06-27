import { z } from "zod";
import type { EBuilderClient } from "../api/client.js";
import { toToolError, toToolResult } from "../api/client.js";
import {
  buildQueryParams,
  buildQueryPath,
  processResourceSchema,
  type QueryRequestBody,
} from "../api/resources.js";
import { TOOL_GUIDES } from "../prompts/domain-guides.js";
import type { ToolRegistrar } from "./types.js";

const filterSchema = z.object({
  Field: z.string(),
  Operation: z.string(),
  Value: z.union([z.string(), z.number(), z.boolean()]),
});

const queryBodySchema = z.object({
  SelectedFields: z.array(z.string()).optional(),
  Filters: z.array(filterSchema).optional(),
  AdvancedScript: z.string().optional(),
});

export function registerQueryProcessesTool(
  server: ToolRegistrar,
  client: EBuilderClient
): void {
  server.registerTool(
    "query_processes",
    {
      description: TOOL_GUIDES.query_processes,
      inputSchema: {
        resource: processResourceSchema.describe(
          "Workflow process resource (invoice approvals, bids, CO workflows)"
        ),
        body: queryBodySchema.describe(
          "Query body from discover_query_schema on the same resource"
        ),
        processPrefix: z
          .string()
          .optional()
          .describe("Tenant process prefix from schema discovery"),
        pageNumber: z.number().int().min(0).optional().default(0),
        pageSize: z.number().int().min(1).max(1000).optional().default(100),
        gridName: z.string().optional(),
        useDynamicGrid: z.boolean().optional(),
      },
    },
    async (args) => {
      try {
        const resource = processResourceSchema.parse(args.resource);
        const body = queryBodySchema.parse(args.body ?? {}) as QueryRequestBody;
        const pageNumber = (args.pageNumber as number | undefined) ?? 0;
        const pageSize = (args.pageSize as number | undefined) ?? 100;

        const path = buildQueryPath(resource, {
          processPrefix: args.processPrefix as string | undefined,
          gridName: args.gridName as string | undefined,
          useDynamicGrid: args.useDynamicGrid as boolean | undefined,
        });

        const params = buildQueryParams({
          schema: false,
          pageNumber,
          pageSize,
          processPrefix: args.processPrefix as string | undefined,
          gridName: args.gridName as string | undefined,
        });

        const data = await client.post(path, body, params);
        return toToolResult({ resource, pageNumber, pageSize, data });
      } catch (error) {
        return toToolError(
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  );
}
