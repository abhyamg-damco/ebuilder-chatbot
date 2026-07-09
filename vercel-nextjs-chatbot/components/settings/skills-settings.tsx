"use client";

import {
  PencilIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { toast } from "@/components/chat/toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AgentSkillPublic } from "@/lib/skills/types";
import { fetcher } from "@/lib/utils";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type SkillsResponse = {
  skills: AgentSkillPublic[];
};

export function SkillsSettings() {
  const router = useRouter();
  const { data, mutate, isLoading } = useSWR<SkillsResponse>(
    `${basePath}/api/skills`,
    fetcher
  );
  const [deletingSkill, setDeletingSkill] = useState<AgentSkillPublic | null>(
    null
  );

  const skills = data?.skills ?? [];

  const handleToggleEnabled = async (skill: AgentSkillPublic) => {
    try {
      const response = await fetch(`${basePath}/api/skills/${skill.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !skill.enabled }),
      });

      if (!response.ok) {
        throw new Error("Failed to update skill");
      }

      await mutate();
    } catch {
      toast({ type: "error", description: "Failed to update skill" });
    }
  };

  const handleDelete = async () => {
    if (!deletingSkill) {
      return;
    }

    try {
      const response = await fetch(
        `${basePath}/api/skills/${deletingSkill.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Failed to delete skill");
      }

      toast({ type: "success", description: "Skill removed" });
      setDeletingSkill(null);
      await mutate();
    } catch {
      toast({ type: "error", description: "Failed to delete skill" });
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6 md:p-10">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <SparklesIcon className="size-5 text-muted-foreground" />
            <h1 className="font-semibold text-xl tracking-tight">
              Agent Skills
            </h1>
          </div>
          <p className="max-w-xl text-muted-foreground text-sm leading-relaxed">
            Create custom instruction sets and reference them in chat with{" "}
            <span className="font-mono">@skill-name</span>. The agent follows
            skill instructions for that message using your existing tools.
          </p>
        </div>
        <Button asChild className="shrink-0" size="sm">
          <Link href={`${basePath}/settings/skills/new`}>
            <PlusIcon className="size-4" />
            Add skill
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/50">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Loading skills…
          </div>
        ) : skills.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <SparklesIcon className="size-8 text-muted-foreground/40" />
            <div>
              <p className="font-medium text-sm">No skills configured</p>
              <p className="mt-1 text-muted-foreground text-xs">
                Add a skill with workflow instructions, then use{" "}
                <span className="font-mono">@slug</span> in chat to activate it.
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href={`${basePath}/settings/skills/new`}>
                <PlusIcon className="size-4" />
                Add your first skill
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {skills.map((skill) => (
              <li className="p-4" key={skill.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm">{skill.name}</span>
                      <Badge className="font-mono" variant="secondary">
                        @{skill.slug}
                      </Badge>
                      <Badge variant={skill.enabled ? "default" : "outline"}>
                        {skill.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    {skill.description ? (
                      <p className="text-muted-foreground text-xs">
                        {skill.description}
                      </p>
                    ) : null}
                    <p className="line-clamp-2 text-muted-foreground text-xs">
                      {skill.content}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      onClick={() => handleToggleEnabled(skill)}
                      size="sm"
                      variant="outline"
                    >
                      {skill.enabled ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      onClick={() =>
                        router.push(
                          `${basePath}/settings/skills/${skill.id}/edit`
                        )
                      }
                      size="sm"
                      variant="outline"
                    >
                      <PencilIcon className="size-3.5" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => setDeletingSkill(skill)}
                      size="sm"
                      variant="outline"
                    >
                      <TrashIcon className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setDeletingSkill(null);
          }
        }}
        open={deletingSkill !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete skill?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingSkill
                ? `"${deletingSkill.name}" (@${deletingSkill.slug}) will be permanently removed.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
