import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const configSchema = z.object({
  baseUrl: z
    .string()
    .url()
    .default("https://api2-us2.e-builder.net"),
  username: z.string().optional(),
  password: z.string().optional(),
  accessToken: z.string().optional(),
  port: z.coerce.number().int().positive().default(8080),
  mcpApiKey: z.string().optional(),
});

export type AppConfig = z.infer<typeof configSchema>;

/** Load and validate environment configuration for the MCP server. */
export function loadConfig(): AppConfig {
  const parsed = configSchema.safeParse({
    baseUrl: process.env.EBUILDER_BASE_URL,
    username: process.env.EBUILDER_USERNAME,
    password: process.env.EBUILDER_PASSWORD,
    accessToken: process.env.EBUILDER_ACCESS_TOKEN,
    port: process.env.PORT,
    mcpApiKey: process.env.MCP_API_KEY,
  });

  if (!parsed.success) {
    throw new Error(`Invalid configuration: ${parsed.error.message}`);
  }

  const config = parsed.data;

  if (!config.accessToken && (!config.username || !config.password)) {
    throw new Error(
      "Set EBUILDER_USERNAME and EBUILDER_PASSWORD, or EBUILDER_ACCESS_TOKEN"
    );
  }

  return config;
}

export const SERVER_NAME = "ebuilder-construct-agent";
export const SERVER_VERSION = "1.0.0";
