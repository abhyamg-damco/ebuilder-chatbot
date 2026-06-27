"use client";

import { LightbulbIcon } from "lucide-react";
import { motion } from "motion/react";
import { Shimmer } from "../ai-elements/shimmer";

type ToolReasoningBannerProps = {
  summary: string;
  isLoading?: boolean;
  modelSnippet?: string;
};

/**
 * Short "why this tool" explanation shown above each tool journey card.
 */
export function ToolReasoningBanner({
  summary,
  isLoading = false,
  modelSnippet,
}: ToolReasoningBannerProps) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.08] to-transparent p-3.5"
      initial={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.35 }}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-lg bg-amber-500/15">
          <LightbulbIcon className="size-3.5 text-amber-700 dark:text-amber-400" />
        </span>
        <span className="font-medium text-[11px] text-amber-900 uppercase tracking-wider dark:text-amber-300">
          Why I&apos;m doing this
        </span>
      </div>

      {isLoading && !summary ? (
        <Shimmer className="text-[13px] leading-relaxed" duration={1.1}>
          Figuring out how to explain this step…
        </Shimmer>
      ) : (
        <p className="text-[13px] text-foreground/90 leading-relaxed">
          {summary}
        </p>
      )}

      {modelSnippet && modelSnippet !== summary ? (
        <p className="mt-2 border-amber-500/15 border-t pt-2 text-[11px] text-muted-foreground leading-relaxed italic">
          From my thinking: {modelSnippet}
        </p>
      ) : null}
    </motion.div>
  );
}
