import { getVapiClientConfig } from "@/lib/vapi/config";
import { VapiFloatingAssistantGate } from "./vapi-floating-assistant-gate";

/** Server entry: loads Vapi env and mounts the gated floating widget. */
export function VapiFloatingAssistantLoader() {
  const config = getVapiClientConfig();

  if (!config) {
    return null;
  }

  return (
    <VapiFloatingAssistantGate
      assistantId={config.assistantId}
      publicKey={config.publicKey}
    />
  );
}
