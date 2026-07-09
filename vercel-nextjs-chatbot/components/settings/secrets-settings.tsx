"use client";

import { KeyRound, PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
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
import type { UserSecretPublic } from "@/lib/secrets/types";
import { fetcher } from "@/lib/utils";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type SecretsResponse = {
  secrets: UserSecretPublic[];
};

export function SecretsSettings() {
  const router = useRouter();
  const { data, mutate, isLoading } = useSWR<SecretsResponse>(
    `${basePath}/api/secrets`,
    fetcher
  );
  const [deletingSecret, setDeletingSecret] = useState<UserSecretPublic | null>(
    null
  );

  const secrets = data?.secrets ?? [];

  const handleDelete = async () => {
    if (!deletingSecret) {
      return;
    }

    try {
      const response = await fetch(
        `${basePath}/api/secrets/${deletingSecret.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Failed to delete secret");
      }

      toast({ type: "success", description: "Secret removed" });
      setDeletingSecret(null);
      await mutate();
    } catch {
      toast({ type: "error", description: "Failed to delete secret" });
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6 md:p-10">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <KeyRound className="size-5 text-muted-foreground" />
            <h1 className="font-semibold text-xl tracking-tight">Secrets</h1>
          </div>
          <p className="max-w-xl text-muted-foreground text-sm leading-relaxed">
            Store credentials and reference them in chat with{" "}
            <span className="font-mono">@secret:slug</span>. Values are injected
            for the agent only and never shown in the chat transcript.
          </p>
        </div>
        <Button asChild className="shrink-0" size="sm">
          <Link href={`${basePath}/settings/secrets/new`}>
            <PlusIcon className="size-4" />
            Add secret
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/50">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Loading secrets…
          </div>
        ) : secrets.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <KeyRound className="size-8 text-muted-foreground/40" />
            <div>
              <p className="font-medium text-sm">No secrets configured</p>
              <p className="mt-1 text-muted-foreground text-xs">
                Add a URL, username, or password, then use{" "}
                <span className="font-mono">@secret:slug</span> in chat.
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href={`${basePath}/settings/secrets/new`}>
                <PlusIcon className="size-4" />
                Add your first secret
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {secrets.map((secret) => (
              <li className="p-4" key={secret.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm">{secret.name}</span>
                      <Badge className="font-mono" variant="secondary">
                        @secret:{secret.slug}
                      </Badge>
                      <Badge variant="outline">{secret.kind}</Badge>
                    </div>
                    {secret.description ? (
                      <p className="text-muted-foreground text-xs">
                        {secret.description}
                      </p>
                    ) : null}
                    <p className="font-mono text-muted-foreground text-xs">
                      {secret.value}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      onClick={() =>
                        router.push(
                          `${basePath}/settings/secrets/${secret.id}/edit`
                        )
                      }
                      size="sm"
                      variant="outline"
                    >
                      <PencilIcon className="size-3.5" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => setDeletingSecret(secret)}
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
            setDeletingSecret(null);
          }
        }}
        open={deletingSecret !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete secret?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingSecret
                ? `"${deletingSecret.name}" (@secret:${deletingSecret.slug}) will be permanently removed.`
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
