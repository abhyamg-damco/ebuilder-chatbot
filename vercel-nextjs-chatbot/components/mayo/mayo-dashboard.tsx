"use client";

import {
  ArrowRightIcon,
  FileSearchIcon,
  FolderPlusIcon,
  LoaderIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MayoClientCase } from "@/lib/mayo/client-types";
import { MAYO_ONEAGENT_BOT } from "@/lib/mayo/config";
import { fetcher } from "@/lib/utils";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type CasesResponse = {
  cases: Array<{
    case: MayoClientCase;
    membership: { role: string };
  }>;
};

export function MayoDashboard() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR<CasesResponse>(
    `${basePath}/api/mayo/cases`,
    fetcher
  );
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectNumber, setProjectNumber] = useState("");
  const [description, setDescription] = useState("");

  async function createCase(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch(`${basePath}/api/mayo/cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          projectName,
          projectNumber: projectNumber || undefined,
          description: description || undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create case");
      }
      await mutate();
      toast.success("Mayo case created");
      router.push(`/mayo/${payload.case.id}`);
    } catch (createError) {
      toast.error(
        createError instanceof Error
          ? createError.message
          : "Unable to create case"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-600">
              <FileSearchIcon className="size-5" />
              <span className="font-mono text-xs uppercase tracking-[0.18em]">
                OpenAI document intelligence
              </span>
            </div>
            <h1 className="font-semibold text-3xl tracking-tight">
              {MAYO_ONEAGENT_BOT.name}
            </h1>
            <p className="max-w-2xl text-muted-foreground">
              {MAYO_ONEAGENT_BOT.description} Every decision remains human.
            </p>
          </div>
          <Button onClick={() => setShowCreate((current) => !current)}>
            <FolderPlusIcon />
            New case
          </Button>
        </header>

        {showCreate ? (
          <form
            className="grid gap-5 rounded-2xl border bg-card p-6 shadow-sm md:grid-cols-2"
            onSubmit={createCase}
          >
            <div className="space-y-2">
              <Label htmlFor="mayo-case-name">Case name</Label>
              <Input
                id="mayo-case-name"
                onChange={(event) => setName(event.target.value)}
                placeholder="Pay application 12 review"
                required
                value={name}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mayo-project-name">Project name</Label>
              <Input
                id="mayo-project-name"
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="Mayo Clinic expansion"
                required
                value={projectName}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mayo-project-number">Project number</Label>
              <Input
                id="mayo-project-number"
                onChange={(event) => setProjectNumber(event.target.value)}
                placeholder="Optional"
                value={projectNumber}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mayo-description">Description</Label>
              <Textarea
                id="mayo-description"
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Review context or reviewer notes"
                value={description}
              />
            </div>
            <div className="flex justify-end gap-2 md:col-span-2">
              <Button
                onClick={() => setShowCreate(false)}
                type="button"
                variant="ghost"
              >
                Cancel
              </Button>
              <Button disabled={submitting} type="submit">
                {submitting ? <LoaderIcon className="animate-spin" /> : null}
                Create case
              </Button>
            </div>
          </form>
        ) : null}

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <LoaderIcon className="mr-2 animate-spin" />
            Loading cases…
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-destructive">
            Unable to load Mayo cases.
          </div>
        ) : null}

        {!isLoading && !error && (data?.cases.length ?? 0) === 0 ? (
          <div className="rounded-2xl border border-dashed p-12 text-center">
            <FileSearchIcon className="mx-auto mb-4 size-8 text-muted-foreground" />
            <h2 className="font-medium text-lg">No review cases yet</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              Create a case, upload the project packet, and let OpenAI index the
              evidence.
            </p>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data?.cases.map(({ case: record, membership }) => (
            <Link
              className="group rounded-2xl border bg-card p-5 transition hover:border-emerald-500/40 hover:shadow-md"
              href={`/mayo/${record.id}`}
              key={record.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{record.name}</h2>
                  <p className="mt-1 text-muted-foreground text-sm">
                    {record.projectName}
                  </p>
                </div>
                <Badge variant="outline">
                  {record.status.replace("_", " ")}
                </Badge>
              </div>
              <div className="mt-6 flex items-center justify-between text-xs">
                <span className="font-mono text-muted-foreground uppercase">
                  {membership.role}
                </span>
                <span className="flex items-center gap-1 text-emerald-600">
                  Open case
                  <ArrowRightIcon className="size-3 transition group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
