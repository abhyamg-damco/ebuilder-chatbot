"use client";

import { GlobeIcon, MessageSquareIcon } from "lucide-react";
import type { ChatSessionType } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type SessionTypePickerProps = {
  onSelect: (type: ChatSessionType) => void;
};

/**
 * Shown after "New chat" so the user picks e-Builder chat vs Trimble automation.
 * Base URL `/` skips this and defaults to general.
 */
export function SessionTypePicker({ onSelect }: SessionTypePickerProps) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4">
      <div className="space-y-1 text-center">
        <h2 className="font-semibold text-xl tracking-tight">
          How do you want to start?
        </h2>
        <p className="text-muted-foreground text-sm">
          Choose a session type for this chat.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          className={cn(
            "flex flex-col items-start gap-2 rounded-xl border border-border/60 bg-card/50 p-4 text-left transition-colors",
            "hover:border-foreground/20 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
          onClick={() => onSelect("general")}
          type="button"
        >
          <MessageSquareIcon className="size-5 text-muted-foreground" />
          <span className="font-medium text-sm">Chat with Ebuilder</span>
          <span className="text-muted-foreground text-xs leading-relaxed">
            General conversation and e-Builder assistance with your usual tools.
          </span>
        </button>

        <button
          className={cn(
            "flex flex-col items-start gap-2 rounded-xl border border-border/60 bg-card/50 p-4 text-left transition-colors",
            "hover:border-foreground/20 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
          onClick={() => onSelect("trimble_automation")}
          type="button"
        >
          <GlobeIcon className="size-5 text-muted-foreground" />
          <span className="font-medium text-sm">Trimble automation</span>
          <span className="text-muted-foreground text-xs leading-relaxed">
            Browserbase-powered workflow: upload files, site login, and a skill.
          </span>
        </button>
      </div>
    </div>
  );
}
