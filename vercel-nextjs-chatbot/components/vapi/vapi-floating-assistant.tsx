"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  VAPI_WEEKLY_STATUS_BOT_TITLE,
  VAPI_WEEKLY_STATUS_CTA_SUBTITLE,
  VAPI_WEEKLY_STATUS_CTA_TITLE,
} from "@/lib/vapi/constants";

const VapiWidgetClient = dynamic(
  () =>
    import("@vapi-ai/client-sdk-react").then((module) => module.VapiWidget),
  { ssr: false }
);

type VapiFloatingAssistantProps = {
  publicKey: string;
  assistantId: string;
};

/** Maps Vapi widget errors to short, user-facing toast messages. */
function showVapiError(error: Error) {
  const normalized = error.message.toLowerCase();

  if (normalized.includes("microphone")) {
    toast.error("Allow microphone access to use voice.");
    return;
  }

  if (normalized.includes("network")) {
    toast.error("Connection error. Check your internet and try again.");
    return;
  }

  toast.error("Something went wrong with the voice assistant. Please try again.");
}

function getVapiPalette(isDark: boolean) {
  if (isDark) {
    return {
      accentColor: "#38bdf8",
      baseBgColor: "#18181b",
      ctaButtonColor: "#0369a1",
      ctaButtonTextColor: "#f8fafc",
    };
  }

  return {
    accentColor: "#0ea5e9",
    baseBgColor: "#ffffff",
    ctaButtonColor: "#0284c7",
    ctaButtonTextColor: "#ffffff",
  };
}

/**
 * Branded eBuilder weekly status bot — constrained card so the SDK panel stays in viewport.
 */
export function VapiFloatingAssistant({
  publicKey,
  assistantId,
}: VapiFloatingAssistantProps) {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "dark" : "light";
  const isDark = theme === "dark";
  const palette = getVapiPalette(isDark);

  return (
    <aside
      aria-label={VAPI_WEEKLY_STATUS_BOT_TITLE}
      className={cn(
        "vapi-weekly-status-widget-host pointer-events-none fixed z-40",
        "top-[calc(3.75rem+env(safe-area-inset-top,0px))]",
        "right-[max(0.75rem,env(safe-area-inset-right,0px))]",
        "w-[min(20rem,calc(100vw-1.5rem))]",
        "max-h-[calc(100dvh-4.25rem-env(safe-area-inset-bottom,0px))]"
      )}
    >
      <div
        className={cn(
          "pointer-events-auto flex max-h-[inherit] min-h-0 flex-col overflow-hidden rounded-2xl border shadow-[var(--shadow-float)]",
          "border-sky-200/70 bg-card",
          "dark:border-sky-800/45"
        )}
      >
        <div className="vapi-weekly-status-embed min-h-0 flex-1 overflow-hidden p-2">
          <VapiWidgetClient
            accentColor={palette.accentColor}
            assistantId={assistantId}
            baseBgColor={palette.baseBgColor}
            borderRadius="large"
            chatEmptyMessage="Ask about weekly status, exceptions, or program health."
            chatPlaceholder="Type your question…"
            ctaButtonColor={palette.ctaButtonColor}
            ctaButtonTextColor={palette.ctaButtonTextColor}
            ctaSubtitle={VAPI_WEEKLY_STATUS_CTA_SUBTITLE}
            ctaTitle={VAPI_WEEKLY_STATUS_CTA_TITLE}
            hybridEmptyMessage="Start a voice call or send a message below."
            mode="hybrid"
            onError={showVapiError}
            position="top-right"
            publicKey={publicKey}
            size="compact"
            theme={theme}
            title="eBuilder weekly status"
            voiceEmptyMessage="Tap start to talk about weekly status."
            voiceShowTranscript
          />
        </div>
      </div>
    </aside>
  );
}
