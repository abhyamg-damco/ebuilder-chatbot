"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { LoaderIcon } from "@/components/chat/icons";
import { toast } from "@/components/chat/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  AgentSkillPublic,
  CreateAgentSkillInput,
} from "@/lib/skills/types";
import { MAX_SKILL_CONTENT_LENGTH } from "@/lib/skills/types";
import { slugifySkillName } from "@/lib/skills/utils";
import { fetcher } from "@/lib/utils";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export type SkillFormValues = {
  name: string;
  slug: string;
  description: string;
  content: string;
  enabled: boolean;
};

const defaultValues: SkillFormValues = {
  name: "",
  slug: "",
  description: "",
  content: "",
  enabled: true,
};

function toFormValues(skill: AgentSkillPublic): SkillFormValues {
  return {
    name: skill.name,
    slug: skill.slug,
    description: skill.description ?? "",
    content: skill.content,
    enabled: skill.enabled,
  };
}

function toPayload(values: SkillFormValues): CreateAgentSkillInput {
  return {
    name: values.name.trim(),
    slug: values.slug.trim(),
    description: values.description.trim() || undefined,
    content: values.content.trim(),
    enabled: values.enabled,
  };
}

export function SkillForm({ skillId }: { skillId?: string }) {
  const router = useRouter();
  const isEditing = Boolean(skillId);
  const slugManuallyEdited = useRef(false);

  const { data, isLoading } = useSWR<{ skill: AgentSkillPublic }>(
    isEditing ? `${basePath}/api/skills/${skillId}` : null,
    fetcher
  );

  const [values, setValues] = useState<SkillFormValues>(defaultValues);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (data?.skill) {
      setValues(toFormValues(data.skill));
    }
  }, [data?.skill]);

  const handleNameChange = (name: string) => {
    setValues((current) => ({
      ...current,
      name,
      slug: slugManuallyEdited.current ? current.slug : slugifySkillName(name),
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const payload = toPayload(values);
      const url = isEditing
        ? `${basePath}/api/skills/${skillId}`
        : `${basePath}/api/skills`;
      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save skill");
      }

      toast({
        type: "success",
        description: isEditing ? "Skill updated" : "Skill created",
      });
      router.push(`${basePath}/settings/skills`);
      router.refresh();
    } catch {
      toast({ type: "error", description: "Failed to save skill" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing && isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground text-sm">
        <LoaderIcon />
        <span className="ml-2">Loading skill…</span>
      </div>
    );
  }

  return (
    <form
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6 md:p-10"
      onSubmit={handleSubmit}
    >
      <div className="space-y-1">
        <h1 className="font-semibold text-xl tracking-tight">
          {isEditing ? "Edit skill" : "New skill"}
        </h1>
        <p className="text-muted-foreground text-sm">
          Define instructions the agent follows when you reference{" "}
          <span className="font-mono">@{values.slug || "your-skill"}</span> in
          chat.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-border/60 bg-card/50 p-6">
        <div className="space-y-2">
          <Label htmlFor="skill-name">Name</Label>
          <Input
            id="skill-name"
            onChange={(event) => handleNameChange(event.target.value)}
            placeholder="Code review"
            required
            value={values.name}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="skill-slug">Slug</Label>
          <Input
            className="font-mono"
            id="skill-slug"
            onChange={(event) => {
              slugManuallyEdited.current = true;
              setValues((current) => ({
                ...current,
                slug: event.target.value.toLowerCase(),
              }));
            }}
            pattern="[a-z0-9][a-z0-9-]*"
            placeholder="code-review"
            required
            value={values.slug}
          />
          <p className="text-muted-foreground text-xs">
            Reference in chat as{" "}
            <span className="font-mono">@{values.slug || "slug"}</span>
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="skill-description">Description</Label>
          <Input
            id="skill-description"
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            placeholder="Short summary shown in autocomplete"
            value={values.description}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="skill-content">Instructions</Label>
            <span className="text-muted-foreground text-xs">
              {values.content.length.toLocaleString()} /{" "}
              {MAX_SKILL_CONTENT_LENGTH.toLocaleString()}
            </span>
          </div>
          <Textarea
            className="min-h-64 font-mono text-[13px] leading-relaxed"
            id="skill-content"
            maxLength={MAX_SKILL_CONTENT_LENGTH}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                content: event.target.value,
              }))
            }
            placeholder="When reviewing code, check security first..."
            required
            value={values.content}
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            checked={values.enabled}
            className="size-4 rounded border-border"
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                enabled: event.target.checked,
              }))
            }
            type="checkbox"
          />
          Enabled (visible in @mention autocomplete)
        </label>
      </div>

      <div className="flex items-center gap-2">
        <Button disabled={isSaving} type="submit">
          {isSaving ? "Saving…" : isEditing ? "Save changes" : "Create skill"}
        </Button>
        <Button
          onClick={() => router.push(`${basePath}/settings/skills`)}
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
