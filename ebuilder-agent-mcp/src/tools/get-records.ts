import { z } from "zod";
import type { EBuilderClient } from "../api/client.js";
import { toToolError, toToolResult } from "../api/client.js";
import { buildGetPath, getResourceSchema } from "../api/resources.js";
import { TOOL_GUIDES } from "../prompts/domain-guides.js";
import type { ToolRegistrar } from "./types.js";

export function registerGetRecordsTool(
  server: ToolRegistrar,
  client: EBuilderClient
): void {
  server.registerTool(
    "get_records",
    {
      description: TOOL_GUIDES.get_records,
      inputSchema: {
        resource: getResourceSchema.describe("GET list resource name"),
        dateModified: z
          .string()
          .optional()
          .describe("ISO date-time filter for incremental fetch"),
        dateCreated: z.string().optional().describe("ISO date-time filter"),
        limit: z.number().int().min(1).max(5000).optional().default(100),
        offset: z.number().int().min(0).optional().default(0),
        schema: z.boolean().optional().describe("Set true to discover schema"),
      },
    },
    async (args) => {
      try {
        const resource = getResourceSchema.parse(args.resource);
        const path = buildGetPath(resource);
        const data = await client.get(path, {
          dateModified: args.dateModified as string | undefined,
          dateCreated: args.dateCreated as string | undefined,
          limit: (args.limit as number | undefined) ?? 100,
          offset: (args.offset as number | undefined) ?? 0,
          schema: args.schema as boolean | undefined,
        });
        return toToolResult({ resource, data });
      } catch (error) {
        return toToolError(
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  );
}

export function registerGetRecordDetailTool(
  server: ToolRegistrar,
  client: EBuilderClient
): void {
  server.registerTool(
    "get_record_detail",
    {
      description: TOOL_GUIDES.get_record_detail,
      inputSchema: {
        resource: getResourceSchema.describe("Resource name"),
        recordId: z.string().describe("Record UUID or identifier"),
        subResource: z
          .enum(["items", "changes", "customfields", "contacts", "reviewers"])
          .optional()
          .describe("Optional sub-resource segment"),
        schema: z.boolean().optional(),
      },
    },
    async (args) => {
      try {
        const resource = getResourceSchema.parse(args.resource);
        const recordId = String(args.recordId);
        const subResource = args.subResource as
          | "items"
          | "changes"
          | "customfields"
          | "contacts"
          | "reviewers"
          | undefined;

        const path = buildGetPath(resource, recordId, subResource);
        const data = await client.get(path, {
          schema: args.schema as boolean | undefined,
        });
        return toToolResult({ resource, recordId, subResource, data });
      } catch (error) {
        return toToolError(
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  );
}
