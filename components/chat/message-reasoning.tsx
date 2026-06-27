"use client";

import { BrainCircuitIcon } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "../ai-elements/reasoning";
import { Shimmer } from "../ai-elements/shimmer";

type MessageReasoningProps = {
  isLoading: boolean;
  reasoning: string;
};

const getReasoningLabel = (isStreaming: boolean, duration?: number) => {
  if (isStreaming || duration === 0) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="relative flex size-5 items-center justify-center">
          <BrainCircuitIcon className="relative z-10 size-3.5 text-primary" />
          <span className="orbit-dot absolute size-1 rounded-full bg-primary/80" />
        </span>
        <Shimmer className="font-medium" duration={1.2}>
          Thinking through the best approach
        </Shimmer>
      </span>
    );
  }

  if (duration === undefined) {
    return (
      <span className="inline-flex items-center gap-2">
        <BrainCircuitIcon className="size-3.5 text-muted-foreground" />
        <span>Here&apos;s how I approached this</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <BrainCircuitIcon className="size-3.5 text-muted-foreground" />
      <span>Here&apos;s how I approached this ({duration}s)</span>
    </span>
  );
};

/** Pulsing nodes that suggest active thought while reasoning streams. */
function ThinkingPulse() {
  return (
    <div className="mb-2 flex items-center justify-center gap-3 py-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          animate={{ opacity: [0.25, 1, 0.25], scale: [0.85, 1.1, 0.85] }}
          className="size-1.5 rounded-full bg-primary/60"
          key={i}
          transition={{
            duration: 1.2,
            repeat: Number.POSITIVE_INFINITY,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
}

export function MessageReasoning({
  isLoading,
  reasoning,
}: MessageReasoningProps) {
  const [hasBeenStreaming, setHasBeenStreaming] = useState(isLoading);
  const isStreamingEmpty = isLoading && reasoning.trim().length === 0;

  useEffect(() => {
    if (isLoading) {
      setHasBeenStreaming(true);
    }
  }, [isLoading]);

  return (
    <Reasoning
      autoCloseOnComplete={false}
      className="rounded-xl border border-primary/10 bg-gradient-to-br from-primary/[0.04] to-transparent px-3 py-2"
      data-testid="message-reasoning"
      defaultOpen={hasBeenStreaming}
      isStreaming={isLoading}
    >
      <ReasoningTrigger getThinkingMessage={getReasoningLabel} />
      {isStreamingEmpty ? <ThinkingPulse /> : null}
      <ReasoningContent>
        {reasoning.trim().length > 0
          ? reasoning
          : "Exploring options and deciding what to do next…"}
      </ReasoningContent>
    </Reasoning>
  );
}
