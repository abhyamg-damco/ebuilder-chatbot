"use client";

import { FileCheckIcon, GlobeIcon, MessageSquareIcon } from "lucide-react";
import type { ChatSessionType } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type SessionTypePickerProps = {
  onSelect: (type: ChatSessionType) => void;
};

/**
 * Shown after "New chat" so the user picks Ivy (general) vs Max (Trimble automation).
 * Base URL `/` skips this and defaults to general.
 */
export function SessionTypePicker({ onSelect }: SessionTypePickerProps) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4">
      <div className="space-y-1 text-center">
        <h2 className="font-semibold text-xl tracking-tight">
          How do you want to start?
        </h2>
        <p className="text-muted-foreground text-sm">
          Choose a session type for this chat.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 sm:grid-cols-2">
        <button
          className={cn(
            "group flex flex-col items-start gap-3 rounded-2xl border border-sky-200/70 bg-gradient-to-br from-sky-50 to-sky-100/40 p-5 text-left transition-all",
            "hover:border-sky-300 hover:shadow-md hover:shadow-sky-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60",
            "dark:border-sky-800/50 dark:from-sky-950/50 dark:to-sky-900/20 dark:hover:border-sky-700 dark:hover:shadow-sky-950/40"
          )}
          onClick={() => onSelect("general")}
          type="button"
        >
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-sky-600 uppercase tracking-wider dark:text-sky-400">
            <span className="size-2 rounded-full bg-sky-500" />
            API mode
          </span>

          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-sky-500/15">
              <MessageSquareIcon className="size-4 text-sky-600 dark:text-sky-400" />
            </span>
            <span className="font-semibold text-base text-foreground">
              Ivy agent
            </span>
          </div>

          <p className="text-foreground/80 text-sm leading-relaxed">
            General conversation and e-Builder assistance with your usual tools.
          </p>

          <div className="mt-auto w-full space-y-1.5 pt-1">
            <div className="rounded-lg border border-sky-100 bg-white/70 px-3 py-2 text-[11px] text-muted-foreground dark:border-sky-900/50 dark:bg-sky-950/30">
              <span className="font-medium text-[9px] text-muted-foreground/70 uppercase tracking-wide">
                You
              </span>
              <p className="mt-0.5 text-foreground/70">
                Any open exceptions on project 767363?
              </p>
            </div>
            <div className="rounded-lg border border-sky-200/60 bg-sky-100/60 px-3 py-2 text-[11px] dark:border-sky-800/40 dark:bg-sky-900/30">
              <span className="font-medium text-[9px] text-sky-600 uppercase tracking-wide dark:text-sky-400">
                Ivy
              </span>
              <p className="mt-0.5 text-foreground/80">
                None — last import loaded 26 tasks clean.
              </p>
            </div>
          </div>
        </button>

        <button
          className={cn(
            "group flex flex-col items-start gap-3 rounded-2xl border border-orange-200/70 bg-gradient-to-br from-orange-50 to-amber-100/40 p-5 text-left transition-all",
            "hover:border-orange-300 hover:shadow-md hover:shadow-orange-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60",
            "dark:border-orange-800/50 dark:from-orange-950/50 dark:to-amber-900/20 dark:hover:border-orange-700 dark:hover:shadow-orange-950/40"
          )}
          onClick={() => onSelect("trimble_automation")}
          type="button"
        >
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-orange-600 uppercase tracking-wider dark:text-orange-400">
            <span className="size-2 rounded-full bg-orange-500" />
            Browser mode
          </span>

          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-orange-500/15">
              <GlobeIcon className="size-4 text-orange-600 dark:text-orange-400" />
            </span>
            <span className="font-semibold text-base text-foreground">
              Max agent
            </span>
          </div>

          <p className="text-foreground/80 text-sm leading-relaxed">
            Browserbase-powered workflow: upload files, site login, and a skill.
          </p>

          <ol className="mt-auto w-full space-y-1.5 pt-1">
            {[
              "Logs in and opens your project",
              "Uploads files and maps columns",
              "Validates and runs the import",
            ].map((step, index) => (
              <li
                className="flex items-start gap-2 text-[11px] text-foreground/75"
                key={step}
              >
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-orange-200/80 font-medium text-[9px] text-orange-700 dark:bg-orange-900/50 dark:text-orange-300">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </button>

        <button
          className={cn(
            "group flex flex-col items-start gap-3 rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-teal-100/40 p-5 text-left transition-all",
            "hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60",
            "dark:border-emerald-800/50 dark:from-emerald-950/50 dark:to-teal-900/20 dark:hover:border-emerald-700 dark:hover:shadow-emerald-950/40"
          )}
          onClick={() => onSelect("invoice_review")}
          type="button"
        >
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-600 uppercase tracking-wider dark:text-emerald-400">
            <span className="size-2 rounded-full bg-emerald-500" />
            Advisory mode
          </span>

          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/15">
              <FileCheckIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
            </span>
            <span className="font-semibold text-base text-foreground">
              Invoice Review Advisor
            </span>
          </div>

          <p className="text-foreground/80 text-sm leading-relaxed">
            Review a draw against contract, prior invoices, and change orders.
            Advisory only — you approve.
          </p>

          <ol className="mt-auto w-full space-y-1.5 pt-1">
            {[
              "Pick persona and tolerances",
              "Reference invoice in e-Builder or attach PDF",
              "Get advisory brief with citations",
            ].map((step, index) => (
              <li
                className="flex items-start gap-2 text-[11px] text-foreground/75"
                key={step}
              >
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-200/80 font-medium text-[9px] text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </button>
      </div>
    </div>
  );
}
