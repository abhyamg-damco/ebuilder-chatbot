import type { McpServer } from "@/lib/db/schema";
import type { McpServerPublic } from "./types";

/** Matches `${VAR_NAME}` placeholders in header values. */
const ENV_PLACEHOLDER_PATTERN = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

/**
 * Replace `${VAR_NAME}` placeholders in a string with values from the env map.
 * Throws when a referenced variable is missing or empty.
 */
export function resolveEnvPlaceholders(
  value: string,
  env: Record<string, string>
): string {
  return value.replace(ENV_PLACEHOLDER_PATTERN, (_match, name: string) => {
    const envValue = env[name];

    if (envValue === undefined || envValue === "") {
      throw new Error(`Missing environment variable: ${name}`);
    }

    return envValue;
  });
}

/** Resolve `${VAR}` placeholders in all HTTP header values using server env. */
export function resolveHeadersWithEnv(
  headers: Record<string, string>,
  env: Record<string, string> = {}
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      resolveEnvPlaceholders(value, env),
    ])
  );
}

/** Preserve existing secret values when the client omits or masks them. */
export function mergeKeyValueRecords(
  existing: Record<string, string>,
  incoming: Record<string, string>
): Record<string, string> {
  const merged: Record<string, string> = { ...existing };

  for (const [key, value] of Object.entries(incoming)) {
    if ((value === "••••••••" || value === "") && existing[key]) {
      merged[key] = existing[key];
    } else {
      merged[key] = value;
    }
  }

  return merged;
}

/** Mask sensitive header values before sending to the client. */
export function maskHeaders(
  headers: Record<string, string>
): Record<string, string> {
  return Object.fromEntries(
    Object.keys(headers).map((key) => [key, "••••••••"])
  );
}

/** Convert a database row into an API-safe MCP server object. */
export function toPublicMcpServer(server: McpServer): McpServerPublic {
  return {
    id: server.id,
    name: server.name,
    description: server.description,
    transport: server.transport as McpServerPublic["transport"],
    url: server.url,
    command: server.command,
    args: server.args ?? [],
    env: maskHeaders(server.env ?? {}),
    headerKeys: Object.keys(server.headers ?? {}),
    enabled: server.enabled,
    createdAt: server.createdAt.toISOString(),
    updatedAt: server.updatedAt.toISOString(),
  };
}

/**
 * Namespace MCP tool names to avoid collisions across servers and built-in tools.
 * OpenAI tool names must match ^[a-zA-Z0-9_-]+$
 */
export function namespaceMcpToolName(
  serverId: string,
  toolName: string
): string {
  const shortId = serverId.replace(/-/g, "").slice(0, 8);
  const safeToolName = toolName.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `mcp_${shortId}_${safeToolName}`;
}

/** Extract the original MCP tool name from a namespaced tool id. */
export function denamespaceMcpToolName(namespaced: string): string {
  const match = namespaced.match(/^mcp_[a-f0-9]{8}_(.+)$/);
  return match?.[1] ?? namespaced;
}

export type ParsedMcpToolType = {
  namespaced: string;
  serverIdShort: string;
  toolName: string;
};

/** Parse a UI tool type like `tool-mcp_abc12345_search` into its parts. */
export function parseMcpToolType(toolType: string): ParsedMcpToolType | null {
  const namespaced = toolType.replace(/^tool-/, "");
  const match = namespaced.match(/^mcp_([a-f0-9]{8})_(.+)$/);

  if (!match) {
    return null;
  }

  return {
    namespaced,
    serverIdShort: match[1],
    toolName: match[2],
  };
}

/** Turn `search_documents` or `getUser` into a readable label. */
export function humanizeIdentifier(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatMcpToolLabel(toolTypeOrName: string): string {
  const name = toolTypeOrName.replace(/^tool-/, "");

  if (name.startsWith("mcp_")) {
    return humanizeIdentifier(denamespaceMcpToolName(name));
  }

  return humanizeIdentifier(name);
}

/** Whether a tool name or UI type refers to an MCP namespaced tool. */
export function isMcpToolName(toolTypeOrName: string): boolean {
  const name = toolTypeOrName.replace(/^tool-/, "");
  return name.startsWith("mcp_");
}

/**
 * Split a full stdio command line into command + args when users paste
 * e.g. `npx -y @modelcontextprotocol/server-everything` into the command field.
 */
export function normalizeStdioConfig(
  command: string,
  args: string[] = []
): { command: string; args: string[] } {
  const trimmedCommand = command.trim();
  const trimmedArgs = args.map((arg) => arg.trim()).filter(Boolean);

  if (trimmedArgs.length === 0 && trimmedCommand.includes(" ")) {
    const segments = trimmedCommand.split(/\s+/);
    return {
      command: segments[0] ?? trimmedCommand,
      args: segments.slice(1),
    };
  }

  return {
    command: trimmedCommand,
    args: trimmedArgs,
  };
}

/** Friendly one-line description of what the tool is doing. */
export function getMcpToolActionLabel(
  toolType: string,
  state: string
): string {
  const action = formatMcpToolLabel(toolType);

  switch (state) {
    case "input-streaming":
      return `Preparing to ${action.toLowerCase()}…`;
    case "input-available":
      return `Fetching data via ${action}…`;
    case "output-available":
      return `Finished: ${action}`;
    case "output-error":
      return `Could not complete: ${action}`;
    case "approval-requested":
      return `Needs your approval: ${action}`;
    case "approval-responded":
      return `Approved: ${action}`;
    case "output-denied":
      return `Cancelled: ${action}`;
    default:
      return action;
  }
}

export type FormattedParam = {
  key: string;
  label: string;
  value: string;
  isLong: boolean;
};

/** Convert tool input into display-friendly key/value rows. */
export function formatToolParams(input: unknown): FormattedParam[] {
  if (input === null || input === undefined) {
    return [];
  }

  if (typeof input !== "object" || Array.isArray(input)) {
    return [
      {
        key: "value",
        label: "Value",
        value: formatDisplayValue(input),
        isLong: formatDisplayValue(input).length > 120,
      },
    ];
  }

  return Object.entries(input as Record<string, unknown>).map(
    ([key, value]) => {
      const formatted = formatDisplayValue(value);
      return {
        key,
        label: humanizeIdentifier(key),
        value: formatted,
        isLong: formatted.length > 120,
      };
    }
  );
}

/** Format a single value for human-readable display. */
export function formatDisplayValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "string") {
    return value.trim() === "" ? "—" : value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "None";
    }

    if (value.every((item) => typeof item === "string" || typeof item === "number")) {
      return value.map(String).join(", ");
    }

    return JSON.stringify(value, null, 2);
  }

  return JSON.stringify(value, null, 2);
}

export type FormattedToolOutput = {
  summary: string;
  items: Array<{ label: string; value: string }>;
  raw: string;
};

/** Extract a friendly summary and rows from MCP tool output. */
export function formatToolOutput(output: unknown): FormattedToolOutput {
  const raw =
    typeof output === "string"
      ? output
      : JSON.stringify(output, null, 2) ?? "";

  if (output === null || output === undefined) {
    return { summary: "No data returned", items: [], raw };
  }

  if (typeof output === "string") {
    return {
      summary: output.length > 160 ? `${output.slice(0, 160)}…` : output,
      items: [],
      raw,
    };
  }

  if (Array.isArray(output)) {
    return {
      summary: `Received ${output.length} item${output.length === 1 ? "" : "s"}`,
      items: output.slice(0, 5).map((item, index) => ({
        label: `Item ${index + 1}`,
        value: formatDisplayValue(item),
      })),
      raw,
    };
  }

  if (typeof output === "object") {
    const record = output as Record<string, unknown>;

    // MCP content blocks: { content: [{ type: "text", text: "..." }] }
    if (Array.isArray(record.content)) {
      const textParts = record.content
        .map((block) => {
          if (
            block &&
            typeof block === "object" &&
            "text" in block &&
            typeof block.text === "string"
          ) {
            return block.text;
          }
          return null;
        })
        .filter((text): text is string => Boolean(text));

      if (textParts.length > 0) {
        const combined = textParts.join("\n\n");
        return {
          summary:
            combined.length > 200 ? `${combined.slice(0, 200)}…` : combined,
          items: [],
          raw,
        };
      }
    }

    const entries = Object.entries(record).slice(0, 8);
    return {
      summary: `Received ${entries.length} field${entries.length === 1 ? "" : "s"}`,
      items: entries.map(([key, value]) => ({
        label: humanizeIdentifier(key),
        value: formatDisplayValue(value),
      })),
      raw,
    };
  }

  return {
    summary: formatDisplayValue(output),
    items: [],
    raw,
  };
}
