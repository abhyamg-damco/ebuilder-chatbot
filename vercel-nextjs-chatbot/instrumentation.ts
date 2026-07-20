import { registerOTel } from "@vercel/otel";
import {
  getLangfuseSpanProcessor,
  isLangfuseTracingEnabled,
} from "@/lib/observability/langfuse";

export function register() {
  if (isLangfuseTracingEnabled()) {
    registerOTel({
      serviceName: "chatbot",
      spanProcessors: ["auto", getLangfuseSpanProcessor()],
    });
    return;
  }

  registerOTel({ serviceName: "chatbot" });
}
