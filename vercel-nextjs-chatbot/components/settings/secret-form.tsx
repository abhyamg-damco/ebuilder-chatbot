"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { LoaderIcon } from "@/components/chat/icons";
import { toast } from "@/components/chat/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CreateUserSecretInput,
  SecretKind,
  UserSecretPublic,
} from "@/lib/secrets/types";
import { SECRET_KINDS } from "@/lib/secrets/types";
import { slugifySecretName } from "@/lib/secrets/utils";
import { fetcher } from "@/lib/utils";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export type SecretFormValues = {
  name: string;
  slug: string;
  kind: SecretKind;
  value: string;
  description: string;
};

const defaultValues: SecretFormValues = {
  name: "",
  slug: "",
  kind: "other",
  value: "",
  description: "",
};

function toFormValues(secret: UserSecretPublic): SecretFormValues {
  return {
    name: secret.name,
    slug: secret.slug,
    kind: secret.kind,
    value: secret.value,
    description: secret.description ?? "",
  };
}

function toPayload(values: SecretFormValues): CreateUserSecretInput {
  return {
    name: values.name.trim(),
    slug: values.slug.trim(),
    kind: values.kind,
    value: values.value,
    description: values.description.trim() || undefined,
  };
}

export function SecretForm({ secretId }: { secretId?: string }) {
  const router = useRouter();
  const isEditing = Boolean(secretId);
  const slugManuallyEdited = useRef(false);

  const { data, isLoading } = useSWR<{ secret: UserSecretPublic }>(
    isEditing ? `${basePath}/api/secrets/${secretId}?reveal=1` : null,
    fetcher
  );

  const [values, setValues] = useState<SecretFormValues>(defaultValues);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (data?.secret) {
      setValues(toFormValues(data.secret));
    }
  }, [data?.secret]);

  const handleNameChange = (name: string) => {
    setValues((current) => ({
      ...current,
      name,
      slug: slugManuallyEdited.current ? current.slug : slugifySecretName(name),
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const payload = toPayload(values);
      const url = isEditing
        ? `${basePath}/api/secrets/${secretId}`
        : `${basePath}/api/secrets`;
      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save secret");
      }

      toast({
        type: "success",
        description: isEditing ? "Secret updated" : "Secret created",
      });
      router.push(`${basePath}/settings/secrets`);
      router.refresh();
    } catch {
      toast({ type: "error", description: "Failed to save secret" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing && isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground text-sm">
        <LoaderIcon />
        <span className="ml-2">Loading secret…</span>
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
          {isEditing ? "Edit secret" : "New secret"}
        </h1>
        <p className="text-muted-foreground text-sm">
          Reference in chat as{" "}
          <span className="font-mono">
            @secret:{values.slug || "your-secret"}
          </span>
          . The agent receives the value privately for tool use.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-border/60 bg-card/50 p-6">
        <div className="space-y-2">
          <Label htmlFor="secret-name">Name</Label>
          <Input
            id="secret-name"
            onChange={(event) => handleNameChange(event.target.value)}
            placeholder="Trimble password"
            required
            value={values.name}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="secret-slug">Slug</Label>
          <Input
            className="font-mono"
            id="secret-slug"
            onChange={(event) => {
              slugManuallyEdited.current = true;
              setValues((current) => ({
                ...current,
                slug: event.target.value.toLowerCase(),
              }));
            }}
            pattern="[a-z0-9][a-z0-9-]*"
            placeholder="trimble-password"
            required
            value={values.slug}
          />
          <p className="text-muted-foreground text-xs">
            Reference in chat as{" "}
            <span className="font-mono">
              @secret:{values.slug || "slug"}
            </span>
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="secret-kind">Kind</Label>
          <Select
            onValueChange={(kind) =>
              setValues((current) => ({
                ...current,
                kind: kind as SecretKind,
              }))
            }
            value={values.kind}
          >
            <SelectTrigger id="secret-kind">
              <SelectValue placeholder="Select kind" />
            </SelectTrigger>
            <SelectContent>
              {SECRET_KINDS.map((kind) => (
                <SelectItem key={kind} value={kind}>
                  {kind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="secret-value">Value</Label>
          <Input
            autoComplete="off"
            id="secret-value"
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                value: event.target.value,
              }))
            }
            required
            type={values.kind === "password" ? "password" : "text"}
            value={values.value}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="secret-description">Description</Label>
          <Input
            id="secret-description"
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            placeholder="Optional note"
            value={values.description}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button disabled={isSaving} type="submit">
          {isSaving
            ? "Saving…"
            : isEditing
              ? "Save changes"
              : "Create secret"}
        </Button>
        <Button
          onClick={() => router.push(`${basePath}/settings/secrets`)}
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
