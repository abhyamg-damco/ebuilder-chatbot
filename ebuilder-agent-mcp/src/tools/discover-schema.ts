import { z } from "zod";
import type { EBuilderClient } from "../api/client.js";
import { toToolError, toToolResult } from "../api/client.js";
import {
  buildQueryParams,
  buildQueryPath,
  queryResourceSchema,
} from "../api/resources.js";
import { TOOL_GUIDES } from "../prompts/domain-guides.js";
import type { ToolRegistrar } from "./types.js";

export function registerDiscoverSchemaTools(
  server: ToolRegistrar,
  client: EBuilderClient
): void {
  server.registerTool(
    "discover_query_schema",
    {
      description: TOOL_GUIDES.discover_query_schema,
      inputSchema: {
        resource: queryResourceSchema.describe(
          "e-Builder resource with a Query endpoint"
        ),
        processPrefix: z
          .string()
          .optional()
          .describe("Process prefix for workflow Query endpoints"),
        gridName: z
          .string()
          .optional()
          .describe("Grid name for DynamicGrid/Query endpoints"),
        useDynamicGrid: z
          .boolean()
          .optional()
          .describe("Use DynamicGrid/Query path when gridName is set"),
      },
    },
    async (args) => {
      try {
        const resource = queryResourceSchema.parse(args.resource);
        const path = buildQueryPath(resource, {
          processPrefix: args.processPrefix as string | undefined,
          gridName: args.gridName as string | undefined,
          useDynamicGrid: args.useDynamicGrid as boolean | undefined,
        });

        const params = buildQueryParams({
          schema: true,
          pageNumber: 0,
          pageSize: 0,
          processPrefix: args.processPrefix as string | undefined,
          gridName: args.gridName as string | undefined,
        });

        const data = await client.post(path, {}, params);
        return toToolResult({
          status: "complete",
          resource,
          path,
          schema: data,
          nextSteps: [
            `Call query_records with resource=${resource} using SelectedFields and Filters from schema above`,
          ],
          agentDirective:
            "Use the schema fields to build query_records — do not answer the user yet.",
          hint: "Use SelectedFields and Filters from this response in query_records.",
        });
      } catch (error) {
        return toToolError(
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  );

  server.registerTool(
    "discover_get_schema",
    {
      description: TOOL_GUIDES.discover_get_schema,
      inputSchema: {
        resource: z
          .string()
          .describe(
            "GET resource name, e.g. SubmittalItems, Forecasts, CashFlows, Budgets"
          ),
        recordId: z
          .string()
          .optional()
          .describe("Record ID for detail-level schema discovery"),
        subResource: z
          .enum(["items", "changes", "customfields", "contacts", "reviewers"])
          .optional()
          .describe("Sub-resource path segment when recordId is set"),
      },
    },
    async (args) => {
      try {
        const resource = String(args.resource);
        let path = `/api/v2/${resource}`;
        if (args.recordId) {
          path += `/${args.recordId}`;
          if (args.subResource) {
            path += `/${args.subResource}`;
          }
        }

        const data = await client.get(path, { schema: true });
        return toToolResult({
          resource,
          path,
          schema: data,
        });
      } catch (error) {
        return toToolError(
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  );
}
