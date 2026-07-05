"use client";

import { motion } from "motion/react";
import { BotIcon, DatabaseIcon, SparklesIcon } from "lucide-react";
import { getActiveToolCount } from "@/lib/chat/tool-parts";
import type { ChatMessage } from "@/lib/types";
import { Shimmer } from "../ai-elements/shimmer";

type ToolActivityBannerProps = {
  parts: ChatMessage["parts"];
  isLoading: boolean;
};

/**
 * Hero banner while tools run — mini data-flow lane + pulsing status.
 */
export function ToolActivityBanner({ parts, isLoading }: ToolActivityBannerProps) {
  const activeCount = getActiveToolCount(parts);

  if (!isLoading || activeCount === 0) {
    return null;
  }

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="composer-glow overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/[0.07] via-background to-primary/[0.04] p-3.5"
      data-testid="tool-activity-banner"
      initial={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-center gap-3">
        <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
          <span className="absolute inset-0 animate-ping rounded-xl bg-primary/15" />
          <SparklesIcon className="relative size-4 text-primary" />
        </div>

        <div className="min-w-0 flex-1">
          <Shimmer className="font-semibold text-[13px]" duration={1.1}>
            {activeCount === 1
              ? "Working with a live connection"
              : `Working with ${activeCount} live connections`}
          </Shimmer>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Sending your request and bringing back real data
          </p>
        </div>
      </div>

      <div className="relative mt-3 flex items-center gap-2 rounded-lg border border-border/30 bg-background/60 px-3 py-2.5">
        <BotIcon className="size-3.5 shrink-0 text-primary" />
        <div className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
          <span className="data-packet-out absolute top-0 size-1.5 rounded-full bg-primary" />
          <span
            className="data-packet-in absolute top-0 size-1.5 rounded-full bg-emerald-500"
            style={{ animationDelay: "1s" }}
          />
        </div>
        <DatabaseIcon className="size-3.5 shrink-0 text-muted-foreground" />
      </div>
    </motion.div>
  );
}
