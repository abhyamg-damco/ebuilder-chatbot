"use client";

import {
  FileCheckIcon,
  PencilIcon,
  PlusIcon,
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
import type { PersonaPublic } from "@/lib/personas/types";
import { fetcher } from "@/lib/utils";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type PersonasResponse = {
  personas: PersonaPublic[];
};

/** Lists and manages invoice review personas. */
export function PersonasSettings() {
  const router = useRouter();
  const { data, mutate, isLoading } = useSWR<PersonasResponse>(
    `${basePath}/api/personas`,
    fetcher
  );
  const [deletingPersona, setDeletingPersona] = useState<PersonaPublic | null>(
    null
  );

  const personas = data?.personas ?? [];

  const handleToggleEnabled = async (persona: PersonaPublic) => {
    try {
      const response = await fetch(`${basePath}/api/personas/${persona.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !persona.enabled }),
      });

      if (!response.ok) {
        throw new Error("Failed to update persona");
      }

      await mutate();
    } catch {
      toast({ type: "error", description: "Failed to update persona" });
    }
  };

  const handleDelete = async () => {
    if (!deletingPersona) {
      return;
    }

    try {
      const response = await fetch(
        `${basePath}/api/personas/${deletingPersona.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Failed to delete persona");
      }

      toast({ type: "success", description: "Persona removed" });
      setDeletingPersona(null);
      await mutate();
    } catch {
      toast({ type: "error", description: "Failed to delete persona" });
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6 md:p-10">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileCheckIcon className="size-5 text-muted-foreground" />
            <h1 className="font-semibold text-xl tracking-tight">
              Review Personas
            </h1>
          </div>
          <p className="max-w-xl text-muted-foreground text-sm leading-relaxed">
            Personas define review style, default tolerances, and check toggles
            for Invoice Review Advisor sessions.
          </p>
        </div>
        <Button asChild className="shrink-0" size="sm">
          <Link href={`${basePath}/settings/personas/new`}>
            <PlusIcon className="size-4" />
            Add persona
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/50">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Loading personas…
          </div>
        ) : personas.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <FileCheckIcon className="size-8 text-muted-foreground/40" />
            <div>
              <p className="font-medium text-sm">No personas configured</p>
              <p className="mt-1 text-muted-foreground text-xs">
                Create a persona with review instructions and default
                tolerances for invoice review sessions.
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href={`${basePath}/settings/personas/new`}>
                <PlusIcon className="size-4" />
                Add your first persona
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {personas.map((persona) => (
              <li className="p-4" key={persona.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm">{persona.name}</span>
                      <Badge className="font-mono" variant="secondary">
                        {persona.slug}
                      </Badge>
                      <Badge variant={persona.enabled ? "default" : "outline"}>
                        {persona.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    {persona.description ? (
                      <p className="text-muted-foreground text-xs">
                        {persona.description}
                      </p>
                    ) : null}
                    <p className="line-clamp-2 text-muted-foreground text-xs">
                      {persona.instructions}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      onClick={() => handleToggleEnabled(persona)}
                      size="sm"
                      variant="outline"
                    >
                      {persona.enabled ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      onClick={() =>
                        router.push(
                          `${basePath}/settings/personas/${persona.id}/edit`
                        )
                      }
                      size="sm"
                      variant="outline"
                    >
                      <PencilIcon className="size-3.5" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => setDeletingPersona(persona)}
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
            setDeletingPersona(null);
          }
        }}
        open={deletingPersona !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete persona?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingPersona
                ? `"${deletingPersona.name}" (${deletingPersona.slug}) will be permanently removed.`
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
