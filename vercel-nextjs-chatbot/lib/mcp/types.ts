import { z } from "zod";

export const mcpTransportTypes = ["http", "sse", "stdio"] as const;
export type McpTransportType = (typeof mcpTransportTypes)[number];

const headersSchema = z.record(z.string(), z.string()).default({});

const baseMcpServerFields = {
  name: z
    .string()
    .min(1, "Name is required")
    .max(128, "Name must be 128 characters or fewer"),
  description: z.string().max(500).optional(),
  enabled: z.boolean().default(true),
  headers: headersSchema,
  env: z.record(z.string(), z.string()).default({}),
};

export const createMcpServerSchema = z.discriminatedUnion("transport", [
  z.object({
    ...baseMcpServerFields,
    transport: z.literal("http"),
    url: z.string().url("A valid HTTP URL is required"),
    command: z.undefined().optional(),
    args: z.undefined().optional(),
  }),
  z.object({
    ...baseMcpServerFields,
    transport: z.literal("sse"),
    url: z.string().url("A valid SSE URL is required"),
    command: z.undefined().optional(),
    args: z.undefined().optional(),
  }),
  z.object({
    ...baseMcpServerFields,
    transport: z.literal("stdio"),
    url: z.undefined().optional(),
    command: z.string().min(1, "Command is required for stdio transport"),
    args: z.array(z.string()).default([]),
  }),
]);

export const updateMcpServerSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  description: z.string().max(500).nullable().optional(),
  enabled: z.boolean().optional(),
  transport: z.enum(mcpTransportTypes).optional(),
  url: z.string().url().nullable().optional(),
  command: z.string().nullable().optional(),
  args: z.array(z.string()).optional(),
  headers: headersSchema.optional(),
  env: z.record(z.string(), z.string()).optional(),
});

export type CreateMcpServerInput = z.infer<typeof createMcpServerSchema>;
export type UpdateMcpServerInput = z.infer<typeof updateMcpServerSchema>;

/** Public MCP server shape returned by the API (secrets masked). */
export type McpServerPublic = {
  id: string;
  name: string;
  description: string | null;
  transport: McpTransportType;
  url: string | null;
  command: string | null;
  args: string[];
  env: Record<string, string>;
  headerKeys: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type McpServerTestResult = {
  success: boolean;
  serverInfo?: {
    name: string;
    version: string;
  };
  toolCount?: number;
  tools?: Array<{ name: string; description?: string }>;
  error?: string;
  checkedAt?: string;
};

/** Live connection status for an MCP server on the settings list. */
export type McpServerStatus = McpServerTestResult & {
  serverId: string;
};
