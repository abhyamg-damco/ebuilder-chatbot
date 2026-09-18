type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonRecord;
  }
  return null;
}

function tryParseJson(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return null;
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }
}

/**
 * Normalizes MCP / AI SDK tool output into a plain JSON object for field extraction.
 * Handles stringified JSON and MCP `{ content: [{ type: "text", text: "..." }] }` envelopes.
 */
export function normalizeToolOutput(output: unknown): JsonRecord | null {
  if (output === null || output === undefined) {
    return null;
  }

  if (typeof output === "string") {
    const parsed = tryParseJson(output);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as JsonRecord)
      : null;
  }

  const record = asRecord(output);
  if (!record) {
    return null;
  }

  const content = record.content;
  if (Array.isArray(content)) {
    for (const item of content) {
      const part = asRecord(item);
      if (!part || part.type !== "text") {
        continue;
      }
      const text = part.text;
      if (typeof text !== "string") {
        continue;
      }
      const parsed = tryParseJson(text);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as JsonRecord;
      }
    }
  }

  return record;
}

export { asRecord, tryParseJson };
