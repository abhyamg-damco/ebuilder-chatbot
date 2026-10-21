import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const configurationSchema = z.object({
  baseUrl: z.string().url().default("https://api2-us2.e-builder.net"),
  username: z.string().optional(),
  password: z.string().optional(),
  accessToken: z.string().optional(),
  processPrefix: z.string().min(1).default("BWPUP"),
  processResource: z.literal("NonCostProcesses").default("NonCostProcesses"),
  port: z.coerce.number().int().positive().default(8080),
  mcpApiKey: z.string().min(16).optional(),
  allowedHosts: z.array(z.string()).default([]),
  writesEnabled: z.boolean().default(false),
  allowedWriteProjectIds: z.array(z.string()).default([]),
});

export type AppConfig = z.infer<typeof configurationSchema>;

function csv(value: string | undefined): string[] {
  return value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
}

function optionalValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export function loadConfig(): AppConfig {
  const parsed = configurationSchema.safeParse({
    baseUrl: process.env.EBUILDER_BASE_URL,
    username: process.env.EBUILDER_USERNAME,
    password: process.env.EBUILDER_PASSWORD,
    accessToken: process.env.EBUILDER_ACCESS_TOKEN,
    processPrefix: process.env.EBUILDER_WEEKLY_PROCESS_PREFIX,
    processResource: process.env.EBUILDER_WEEKLY_PROCESS_RESOURCE,
    port: process.env.PORT,
    mcpApiKey: optionalValue(process.env.MCP_API_KEY),
    allowedHosts: csv(process.env.MCP_ALLOWED_HOSTS),
    writesEnabled: process.env.EBUILDER_WRITES_ENABLED === "true",
    allowedWriteProjectIds: csv(process.env.EBUILDER_ALLOWED_WRITE_PROJECT_IDS),
  });
  if (!parsed.success) throw new Error(`Invalid configuration: ${parsed.error.message}`);
  if (!parsed.data.accessToken && (!parsed.data.username || !parsed.data.password)) {
    throw new Error("Set EBUILDER_ACCESS_TOKEN or EBUILDER_USERNAME and EBUILDER_PASSWORD.");
  }
  return parsed.data;
}

export const SERVER_NAME = "ebuilder-weekly-status";
export const SERVER_VERSION = "1.0.0";
