"use client";

import { SparklesIcon } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import type { AgentSkillPublic } from "@/lib/skills/types";
import { cn } from "@/lib/utils";

export type SkillMentionOption = Pick<
  AgentSkillPublic,
  "id" | "name" | "slug" | "description"
>;

type SkillMentionMenuProps = {
  skills: SkillMentionOption[];
  query: string;
  onSelect: (skill: SkillMentionOption) => void;
  onClose: () => void;
  selectedIndex: number;
};

export function filterSkillsByQuery(
  skills: SkillMentionOption[],
  query: string
): SkillMentionOption[] {
  const normalized = query.toLowerCase();
  return skills.filter(
    (skill) =>
      skill.slug.startsWith(normalized) ||
      skill.name.toLowerCase().includes(normalized)
  );
}

export function SkillMentionMenu({
  skills,
  query,
  onSelect,
  onClose: _onClose,
  selectedIndex,
}: SkillMentionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = filterSkillsByQuery(skills, query);

  useEffect(() => {
    const selected = menuRef.current?.querySelector("[data-selected='true']");
    if (selected) {
      selected.scrollIntoView({ block: "nearest" });
    }
  }, []);

  if (filtered.length === 0) {
    return (
      <div className="absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-xl border border-border/50 bg-card/95 p-4 text-center text-muted-foreground text-xs shadow-[var(--shadow-float)] backdrop-blur-xl">
        No matching skills. Create one in Settings → Agent skills.
      </div>
    );
  }

  return (
    <div
      className="absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-xl border border-border/50 bg-card/95 shadow-[var(--shadow-float)] backdrop-blur-xl"
      ref={menuRef}
    >
      <div className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/40">
        Skills
      </div>
      <div className="max-h-64 overflow-y-auto pb-1 no-scrollbar">
        {filtered.map((skill, index) => (
          <button
            className={cn(
              "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
              index === selectedIndex ? "bg-muted/70" : "hover:bg-muted/40"
            )}
            data-selected={index === selectedIndex}
            key={skill.id}
            onClick={() => onSelect(skill)}
            onMouseDown={(event) => event.preventDefault()}
            type="button"
          >
            <div className="flex size-6 shrink-0 items-center justify-center text-muted-foreground/60">
              <SparklesIcon className="size-3.5" />
            </div>
            <span className="font-mono text-[13px] text-foreground">
              @{skill.slug}
            </span>
            <span className="truncate text-[12px] text-muted-foreground/50">
              {skill.description ?? skill.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Selected skill chips shown above the composer. */
export function SelectedSkillChips({
  skills,
  onRemove,
}: {
  skills: SkillMentionOption[];
  onRemove: (skillId: string) => void;
}) {
  if (skills.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5 px-3 pt-3">
      {skills.map((skill) => (
        <span
          className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/50 px-2 py-0.5 text-[11px]"
          key={skill.id}
        >
          <SparklesIcon className="size-3 text-muted-foreground/70" />
          <span className="font-mono">@{skill.slug}</span>
          <button
            aria-label={`Remove @${skill.slug}`}
            className="rounded-full px-1 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => onRemove(skill.id)}
            type="button"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}

/**
 * Returns mention query state when the caret is in an @mention token.
 * Ignores email-like patterns (only @ at start or after whitespace).
 */
export function getSkillMentionState(
  input: string
): { query: string; mentionStart: number } | null {
  if (input.startsWith("/") && !input.includes(" ")) {
    return null;
  }

  const match = input.match(/(?:^|\s)@([a-z0-9-]*)$/i);

  if (!match) {
    return null;
  }

  const query = match[1].toLowerCase();
  const atIndex = input.lastIndexOf(`@${match[1]}`);

  if (atIndex < 0) {
    return null;
  }

  return { query, mentionStart: atIndex };
}

/** Renders message text with @skill slugs styled as pills. */
export function renderTextWithSkillMentions(text: string): ReactNode {
  const parts = text.split(/((?:^|\s)@[a-z0-9][a-z0-9-]*)/gi);

  return parts.map((part, index) => {
    const mentionMatch = part.match(/(?:^|\s)@([a-z0-9][a-z0-9-]*)/i);

    if (mentionMatch) {
      const prefix = part.startsWith(" ") ? " " : "";
      return (
        <span key={`${part}-${index}`}>
          {prefix}
          <span className="rounded-md bg-primary/10 px-1 py-0.5 font-mono text-[12px] text-primary">
            @{mentionMatch[1]}
          </span>
        </span>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}
