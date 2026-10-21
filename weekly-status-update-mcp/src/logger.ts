/**
 * Structured logs are written to stdout/stderr so Cloud Run can index them.
 * Keep secrets and free-form weekly-update values out of these events.
 */
type LogLevel = "debug" | "info" | "warn" | "error";
type LogFields = Record<string, unknown>;

const severity: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function configuredLevel(): LogLevel {
  const value = process.env.MCP_LOG_LEVEL?.toLowerCase();
  return value === "debug" || value === "warn" || value === "error" ? value : "info";
}

export function logEvent(level: LogLevel, event: string, fields: LogFields = {}): void {
  if (severity[level] < severity[configuredLevel()]) return;
  const entry = JSON.stringify({ severity: level.toUpperCase(), event, timestamp: new Date().toISOString(), ...fields });
  (level === "warn" || level === "error" ? console.error : console.log)(entry);
}

/** Returns safe diagnostic fields without copying API response bodies into logs. */
export function safeErrorFields(error: unknown): LogFields {
  const message = error instanceof Error ? error.message : String(error);
  const supportId = message.match(/"supportId"\s*:\s*"([^"\\]+)"/)?.[1];
  const status = message.match(/\((\d{3})\)/)?.[1];
  return {
    errorType: error instanceof Error ? error.name : typeof error,
    ...(status ? { upstreamStatus: Number(status) } : {}),
    ...(supportId ? { supportId } : {}),
  };
}
