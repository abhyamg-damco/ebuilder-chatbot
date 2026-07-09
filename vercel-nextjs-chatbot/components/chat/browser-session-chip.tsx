"use client";

import { GlobeIcon, MonitorIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type BrowserSessionChipProps = {
  title: string;
  subtitle?: string;
  onClick: () => void;
  className?: string;
  /** When true, shows a compact card like file attachments in user messages. */
  variant?: "card" | "inline";
};

/**
 * Clickable browser session affordance shown in chat — opens the live view panel.
 */
export function BrowserSessionChip({
  title,
  subtitle,
  onClick,
  className,
  variant = "card",
}: BrowserSessionChipProps) {
  if (variant === "inline") {
    return (
      <button
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-full border border-border/50 bg-muted/60 px-2.5 text-xs transition-colors hover:bg-muted",
          className
        )}
        onClick={onClick}
        type="button"
      >
        <MonitorIcon className="size-3.5 text-muted-foreground" />
        <span className="max-w-[10rem] truncate font-medium">{title}</span>
        <span className="flex items-center gap-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
          <GlobeIcon className="size-2.5" />
          Browser
        </span>
      </button>
    );
  }

  return (
    <button
      className={cn("group shrink-0 text-left", className)}
      onClick={onClick}
      type="button"
    >
      <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-border/40 bg-muted transition-colors group-hover:border-primary/40 group-hover:bg-muted/80">
        <div className="flex size-full flex-col items-center justify-center gap-1 px-2 text-center text-muted-foreground">
          <MonitorIcon className="size-5 shrink-0" />
          <span className="line-clamp-2 text-[10px] leading-tight font-medium text-foreground">
            {title}
          </span>
          {subtitle ? (
            <span className="line-clamp-1 text-[9px] opacity-70">{subtitle}</span>
          ) : null}
        </div>

        <div
          className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded bg-primary/90 px-1 py-0.5 text-[8px] font-medium text-primary-foreground"
          title="Open live browser"
        >
          <GlobeIcon className="size-2.5" />
          Browser
        </div>
      </div>
    </button>
  );
}
