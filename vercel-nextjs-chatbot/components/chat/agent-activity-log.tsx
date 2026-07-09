"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Shimmer } from "../ai-elements/shimmer";
import type { AgentActivityDisplayEntry } from "./agent-activity-provider";

type AgentActivityLogProps = {
  activities: AgentActivityDisplayEntry[];
  isStreaming?: boolean;
  className?: string;
};

const MAX_VISIBLE_LINES = 6;

/**
 * Lightweight faded process log — holistic step narration, not the main response.
 */
export function AgentActivityLog({
  activities,
  isStreaming = false,
  className,
}: AgentActivityLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isStreaming || !scrollRef.current) {
      return;
    }

    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activities, isStreaming]);

  if (activities.length === 0) {
    return null;
  }

  const visibleActivities = activities.slice(-MAX_VISIBLE_LINES);
  const hiddenCount = activities.length - visibleActivities.length;

  return (
    <div
      className={cn("relative", className)}
      data-testid="agent-activity-log"
    >
      {hiddenCount > 0 ? (
        <p className="mb-1 text-[10px] text-muted-foreground/45">
          {hiddenCount} earlier step{hiddenCount === 1 ? "" : "s"}…
        </p>
      ) : null}

      <div
        className="relative max-h-[7.5rem] overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_12%)]"
        ref={scrollRef}
      >
        <ul className="flex flex-col gap-1">
          {visibleActivities.map((activity, index) => {
            const isLast = index === visibleActivities.length - 1;
            const isActive =
              isStreaming && isLast && activity.status === "active";

            return (
              <motion.li
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex items-start gap-2 text-[11px] leading-relaxed",
                  activity.status === "error"
                    ? "text-destructive/70"
                    : isActive
                      ? "text-muted-foreground/80"
                      : "text-muted-foreground/55"
                )}
                initial={{ opacity: 0, y: 3 }}
                key={activity.id}
                transition={{ duration: 0.2 }}
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-[0.35rem] size-1 shrink-0 rounded-full",
                    isActive
                      ? "animate-pulse bg-primary/60"
                      : activity.status === "error"
                        ? "bg-destructive/50"
                        : "bg-muted-foreground/35"
                  )}
                />
                {isActive ? (
                  <Shimmer className="text-[11px] leading-relaxed" duration={1.2}>
                    {activity.message}
                  </Shimmer>
                ) : (
                  <span>{activity.message}</span>
                )}
              </motion.li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
