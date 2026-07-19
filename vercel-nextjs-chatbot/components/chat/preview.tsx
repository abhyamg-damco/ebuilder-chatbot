"use client";

import { useRouter } from "next/navigation";
import { ivyDemoSuggestions } from "@/lib/constants";
import { SparklesIcon } from "./icons";

export function Preview() {
  const router = useRouter();

  const handleAction = (query?: string) => {
    const url = query ? `/?query=${encodeURIComponent(query)}` : "/";
    router.push(url);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-tl-2xl bg-background">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border/20 px-5">
        <div className="flex size-5 items-center justify-center rounded bg-sky-500/15 ring-1 ring-sky-400/30">
          <SparklesIcon size={10} />
        </div>
        <span className="text-[13px] text-muted-foreground">Ivy · e-Builder insights</span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-8">
        <div className="text-center">
          <h2 className="font-semibold text-xl tracking-tight">
            Ask Ivy about your program data
          </h2>
          <p className="mt-1.5 text-muted-foreground text-sm">
            Charts, tables, and document previews from e-Builder — powered by MCP.
          </p>
        </div>

        <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
          {ivyDemoSuggestions.slice(0, 6).map((suggestion) => (
            <button
              className="rounded-xl border border-sky-200/50 bg-sky-50/40 px-3 py-2.5 text-left text-[11px] leading-relaxed text-foreground/80 transition-all duration-200 hover:border-sky-300 hover:bg-sky-100/60 dark:border-sky-900/40 dark:bg-sky-950/20 dark:hover:border-sky-800"
              key={suggestion}
              onClick={() => handleAction(suggestion)}
              type="button"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      <div className="shrink-0 px-5 pb-5">
        <button
          className="flex w-full items-center rounded-2xl border border-border/30 bg-card/30 px-4 py-3 text-left text-[13px] text-muted-foreground/40 transition-colors hover:border-border/50 hover:text-muted-foreground/60"
          onClick={() => handleAction()}
          type="button"
        >
          Ask Ivy anything about budgets, invoices, vendors…
        </button>
      </div>
    </div>
  );
}
