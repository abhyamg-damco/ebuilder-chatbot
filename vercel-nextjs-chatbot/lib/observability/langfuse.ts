import "server-only";

import { LangfuseSpanProcessor } from "@langfuse/otel";
import { propagateAttributes } from "@langfuse/tracing";
import type { AttributeValue } from "@opentelemetry/api";

/** AI SDK `experimental_telemetry` shape used across chat and artifact LLM calls. */
export type AiSdkTelemetrySettings = {
  isEnabled?: boolean;
  recordInputs?: boolean;
  recordOutputs?: boolean;
  functionId?: string;
  metadata?: Record<string, AttributeValue>;
};

const SENSITIVE_VALUE_PATTERN =
  /"(?:password|secret|token|api[_-]?key|authorization|credential)"\s*:\s*"[^"]*"/gi;
const BEARER_PATTERN = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi;

/**
 * Redact common secret patterns before spans are exported to Langfuse.
 */
function maskLangfuseExportData(params: { data: unknown }): unknown {
  const { data } = params;

  if (typeof data === "string") {
    return data
      .replace(SENSITIVE_VALUE_PATTERN, '"[redacted]":"***"')
      .replace(BEARER_PATTERN, "Bearer ***");
  }

  if (Array.isArray(data)) {
    return data.map((entry) => maskLangfuseExportData({ data: entry }));
  }

  if (data !== null && typeof data === "object") {
    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes("password") ||
        lowerKey.includes("secret") ||
        lowerKey.includes("token") ||
        lowerKey.includes("authorization")
      ) {
        masked[key] = "***";
      } else {
        masked[key] = maskLangfuseExportData({ data: value });
      }
    }
    return masked;
  }

  return data;
}

let langfuseSpanProcessor: LangfuseSpanProcessor | undefined;

/**
 * Returns true when Langfuse keys are configured and tracing is not explicitly disabled.
 */
export function isLangfuseTracingEnabled(): boolean {
  if (process.env.LANGFUSE_TRACING_ENABLED === "false") {
    return false;
  }

  return Boolean(
    process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY
  );
}

/**
 * Shared Langfuse span processor instance (used by instrumentation and flush).
 */
export function getLangfuseSpanProcessor(): LangfuseSpanProcessor {
  if (!langfuseSpanProcessor) {
    langfuseSpanProcessor = new LangfuseSpanProcessor({
      mask: maskLangfuseExportData,
    });
  }

  return langfuseSpanProcessor;
}

/** Flush pending Langfuse spans (call from `after()` on streaming routes). */
export async function flushLangfuseTraces(): Promise<void> {
  if (!isLangfuseTracingEnabled()) {
    return;
  }

  await getLangfuseSpanProcessor().forceFlush();
}

export type AiSdkTelemetryOptions = {
  functionId: string;
  metadata?: Record<string, string | number | boolean>;
  recordInputs?: boolean;
  recordOutputs?: boolean;
};

/** Builds AI SDK telemetry settings for a single LLM call site. */
export function getAiSdkTelemetrySettings(
  options: AiSdkTelemetryOptions
): AiSdkTelemetrySettings {
  const metadata: Record<string, AttributeValue> = {};

  if (options.metadata) {
    for (const [key, value] of Object.entries(options.metadata)) {
      metadata[key] = String(value);
    }
  }

  return {
    isEnabled: isLangfuseTracingEnabled(),
    functionId: options.functionId,
    metadata,
    recordInputs: options.recordInputs,
    recordOutputs: options.recordOutputs,
  };
}

export type ChatTraceContextParams = {
  chatId: string;
  userId: string;
  sessionType: string | null;
  visibility?: string;
  isNewChat?: boolean;
  chatModel?: string;
};

function buildChatTraceMetadata(
  params: ChatTraceContextParams
): Record<string, string> {
  const metadata: Record<string, string> = {};

  if (params.chatModel) {
    metadata.chatModel = params.chatModel.slice(0, 200);
  }

  if (params.sessionType) {
    metadata.sessionType = params.sessionType.slice(0, 200);
  }

  if (params.visibility) {
    metadata.visibility = params.visibility.slice(0, 200);
  }

  if (params.isNewChat !== undefined) {
    metadata.isNewChat = String(params.isNewChat);
  }

  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID;
  if (deploymentId) {
    metadata.vercelDeploymentId = deploymentId.slice(0, 200);
  }

  return metadata;
}

/**
 * Attaches Langfuse user/session/tags for one chat turn (OpenTelemetry baggage).
 */
export function runWithChatTraceContext<T>(
  params: ChatTraceContextParams,
  fn: () => T
): T {
  if (!isLangfuseTracingEnabled()) {
    return fn();
  }

  const tags = params.sessionType ? [params.sessionType] : [];

  return propagateAttributes(
    {
      userId: params.userId,
      sessionId: params.chatId,
      traceName: "chat-turn",
      tags,
      metadata: buildChatTraceMetadata(params),
    },
    fn
  );
}

/** Telemetry preset for artifact document handlers (`text`, `code`, `sheet`). */
export function getArtifactTelemetrySettings(
  kind: string,
  modelId: string
): AiSdkTelemetrySettings {
  return getAiSdkTelemetrySettings({
    functionId: `artifact-${kind}`,
    metadata: { modelId },
  });
}
