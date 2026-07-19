"use client";

import { BarChart3Icon, ExternalLinkIcon, FileSpreadsheetIcon, ImageIcon } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import type { ArtifactKind } from "@/components/chat/artifact";
import { Badge } from "@/components/ui/badge";
import type { Document } from "@/lib/db/schema";
import { fetcher } from "@/lib/utils";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type InsightsResponse = {
  documents: Document[];
};

function kindIcon(kind: ArtifactKind) {
  switch (kind) {
    case "chart":
    case "dashboard":
      return <BarChart3Icon className="size-4 text-sky-600" />;
    case "file-preview":
      return <ImageIcon className="size-4 text-violet-600" />;
    default:
      return <FileSpreadsheetIcon className="size-4 text-emerald-600" />;
  }
}

/** Saved Ivy insight artifacts library. */
export function InsightsSettings() {
  const { data, isLoading } = useSWR<InsightsResponse>(
    `${basePath}/api/insights`,
    fetcher
  );

  const documents = data?.documents ?? [];

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Saved insights</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Charts, dashboards, tables, and file previews from Ivy sessions.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading insights…</p>
      ) : documents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-muted-foreground text-sm">
          No insight artifacts yet. Ask Ivy a data question with MCP connected to
          generate charts and tables.
        </div>
      ) : (
        <ul className="divide-y divide-border/50 rounded-xl border border-border/60">
          {documents.map((doc) => (
            <li className="flex items-center gap-3 px-4 py-3" key={doc.id}>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/50">
                {kindIcon(doc.kind as ArtifactKind)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-sm">{doc.title}</div>
                <div className="text-muted-foreground text-xs">
                  {new Date(doc.createdAt).toLocaleString()}
                </div>
              </div>
              <Badge className="shrink-0 capitalize" variant="secondary">
                {doc.kind}
              </Badge>
              <Link
                className="inline-flex shrink-0 items-center gap-1 text-sky-600 text-xs hover:underline dark:text-sky-400"
                href={`${basePath}/api/document?id=${doc.id}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                JSON
                <ExternalLinkIcon className="size-3" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
