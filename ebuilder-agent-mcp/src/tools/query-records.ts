import { z } from "zod";
import type { EBuilderClient } from "../api/client.js";
import { toToolError, toToolResult } from "../api/client.js";
import {
  buildQueryParams,
  buildQueryPath,
  queryResourceSchema,
  type QueryRequestBody,
} from "../api/resources.js";
import { TOOL_GUIDES } from "../prompts/domain-guides.js";
import type { ToolRegistrar } from "./types.js";

function extractRecordsFromResponse(data: unknown): unknown[] {
  if (!data || typeof data !== "object") {
    return [];
  }
  const records = (data as { records?: unknown[] }).records;
  return Array.isArray(records) ? records : [];
}

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

export function registerQueryRecordsTool(
  server: ToolRegistrar,
  client: EBuilderClient
): void {
  server.registerTool(
    "query_records",
    {
      description: TOOL_GUIDES.query_records,
      inputSchema: {
        resource: queryResourceSchema.describe("Target e-Builder Query resource"),
        body: queryBodySchema.describe(
          "Query body with SelectedFields, Filters, AdvancedScript from schema discovery"
        ),
        pageNumber: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Page number (0-based). Default 0."),
        pageSize: z
          .number()
          .int()
          .min(1)
          .max(1000)
          .optional()
          .describe("Records per page. Default 100."),
        processPrefix: z
          .string()
          .optional()
          .describe("Process prefix for workflow queries"),
        gridName: z
          .string()
          .optional()
          .describe("Grid name for DynamicGrid queries"),
        useDynamicGrid: z
          .boolean()
          .optional()
          .describe("Route to DynamicGrid/Query when true"),
      },
    },
    async (args) => {
      try {
        const resource = queryResourceSchema.parse(args.resource);
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
        const records = extractRecordsFromResponse(data);

        return toToolResult({
          status: records.length > 0 ? "complete" : "incomplete",
          resource,
          pageNumber,
          pageSize,
          recordCount: records.length,
          data,
          nextSteps:
            records.length === 0
              ? [
                  "Call discover_query_schema on the same resource — verify SelectedFields and Filters",
                  "Broaden Filters (LIKE with %wildcards%) or remove filters",
                  "Try resolve_project / resolve_company if filtering by entity name",
                ]
              : [
                  "If more pages exist, increase pageNumber",
                  "Use aggregate_records if the user needs sums, counts, or top-N",
              ],
          agentDirective:
            records.length === 0
              ? "DO NOT tell the user no data exists. Follow nextSteps first."
              : "Analyze records and answer the user, or call aggregate_records if needed.",
        });
      } catch (error) {
        return toToolError(
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  );
}
