"use client";

import { usePathname } from "next/navigation";
import { useActiveChat } from "@/hooks/use-active-chat";
import type { VapiClientConfig } from "@/lib/vapi/config";
import { isNewChatHomePath } from "@/lib/vapi/constants";
import { VapiFloatingAssistant } from "./vapi-floating-assistant";

/**
 * Renders the Vapi widget only on the home new-chat screen (before /chat/:id).
 */
export function VapiFloatingAssistantGate({
  publicKey,
  assistantId,
}: VapiClientConfig) {
  const pathname = usePathname();
  const { isNewChat } = useActiveChat();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  if (!isNewChat || !isNewChatHomePath(pathname, basePath)) {
    return null;
  }

  return (
    <VapiFloatingAssistant assistantId={assistantId} publicKey={publicKey} />
  );
}
