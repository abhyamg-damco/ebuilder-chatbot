"use client";

import {
  ChevronDownIcon,
  GlobeIcon,
  PencilIcon,
  PlugIcon,
  PlusIcon,
  RefreshCwIcon,
  ServerIcon,
  TrashIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { McpServerPublic, McpServerStatus } from "@/lib/mcp/types";
import { fetcher } from "@/lib/utils";
import {
  McpConnectionError,
  McpConnectionStatus,
} from "./mcp-connection-status";
import { McpToolsList } from "./mcp-tools-list";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type McpServersResponse = {
  servers: McpServerPublic[];
  statuses?: McpServerStatus[];
};

export function McpServersSettings() {
  const router = useRouter();
  const { data, mutate, isLoading, isValidating } = useSWR<McpServersResponse>(
    `${basePath}/api/mcp-servers?status=true`,
    fetcher
  );

  const [deletingServer, setDeletingServer] = useState<McpServerPublic | null>(
    null
  );
  const [expandedServers, setExpandedServers] = useState<Set<string>>(
    new Set()
  );

  const servers = data?.servers ?? [];
  const statusByServerId = useMemo(() => {
    const map = new Map<string, McpServerStatus>();
    for (const status of data?.statuses ?? []) {
      map.set(status.serverId, status);
    }
    return map;
  }, [data?.statuses]);

  const handleRefreshStatus = async () => {
    try {
      await mutate();
      toast({ type: "success", description: "Server status refreshed" });
    } catch {
      toast({ type: "error", description: "Failed to refresh server status" });
    }
  };

  const handleToggleEnabled = async (server: McpServerPublic) => {
    try {
      const response = await fetch(`${basePath}/api/mcp-servers/${server.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !server.enabled }),
      });

      if (!response.ok) {
        throw new Error("Failed to update server");
      }

      await mutate();
    } catch {
      toast({ type: "error", description: "Failed to update MCP server" });
    }
  };

  const handleDelete = async () => {
    if (!deletingServer) {
      return;
    }

    try {
      const response = await fetch(
        `${basePath}/api/mcp-servers/${deletingServer.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Failed to delete server");
      }

      toast({ type: "success", description: "MCP server removed" });
      setDeletingServer(null);
      await mutate();
    } catch {
      toast({ type: "error", description: "Failed to delete MCP server" });
    }
  };

  const toggleExpanded = (serverId: string) => {
    setExpandedServers((current) => {
      const next = new Set(current);
      if (next.has(serverId)) {
        next.delete(serverId);
      } else {
        next.add(serverId);
      }
      return next;
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6 md:p-10">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <PlugIcon className="size-5 text-muted-foreground" />
            <h1 className="font-semibold text-xl tracking-tight">
              MCP Servers
            </h1>
          </div>
          <p className="max-w-xl text-muted-foreground text-sm leading-relaxed">
            Connect Model Context Protocol servers to extend the assistant with
            external tools. Enabled servers are available in every chat.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            disabled={isLoading || isValidating || servers.length === 0}
            onClick={handleRefreshStatus}
            size="sm"
            variant="outline"
          >
            <RefreshCwIcon
              className={isValidating ? "size-4 animate-spin" : "size-4"}
            />
            Refresh status
          </Button>
          <Button asChild size="sm">
            <Link href={`${basePath}/settings/mcp/new`}>
              <PlusIcon className="size-4" />
              Add server
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/50">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Loading MCP servers…
          </div>
        ) : servers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <ServerIcon className="size-8 text-muted-foreground/40" />
            <div>
              <p className="font-medium text-sm">No MCP servers configured</p>
              <p className="mt-1 text-muted-foreground text-xs">
                Add an HTTP MCP server to connect tools from services like
                Linear, Notion, or your own APIs.
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href={`${basePath}/settings/mcp/new`}>
                <PlusIcon className="size-4" />
                Add your first server
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {servers.map((server) => {
              const status = statusByServerId.get(server.id);
              const isExpanded = expandedServers.has(server.id);
              const tools = status?.tools ?? [];

              return (
                <li className="p-4" key={server.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm">{server.name}</span>
                        <Badge variant="secondary">{server.transport}</Badge>
                        <Badge variant={server.enabled ? "default" : "outline"}>
                          {server.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                        <McpConnectionStatus
                          isChecking={isValidating && !status}
                          status={status}
                        />
                      </div>
                      {server.description ? (
                        <p className="text-muted-foreground text-xs">
                          {server.description}
                        </p>
                      ) : null}
                      <p className="truncate font-mono text-muted-foreground text-xs">
                        {server.transport === "stdio"
                          ? `${server.command} ${server.args.join(" ")}`
                          : server.url}
                      </p>
                      {status ? <McpConnectionError status={status} /> : null}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        onClick={() => handleToggleEnabled(server)}
                        size="sm"
                        variant="outline"
                      >
                        {server.enabled ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        onClick={() =>
                          router.push(
                            `${basePath}/settings/mcp/${server.id}/edit`
                          )
                        }
                        size="sm"
                        variant="outline"
                      >
                        <PencilIcon className="size-3.5" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => setDeletingServer(server)}
                        size="sm"
                        variant="outline"
                      >
                        <TrashIcon className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {status?.success ? (
                    <Collapsible
                      className="mt-3"
                      onOpenChange={() => toggleExpanded(server.id)}
                      open={isExpanded}
                    >
                      <CollapsibleTrigger className="group flex items-center gap-2 text-muted-foreground text-xs transition-colors hover:text-foreground">
                        <ChevronDownIcon className="size-3.5 transition-transform group-data-[state=open]:rotate-180" />
                        {isExpanded
                          ? "Hide tools"
                          : `View ${tools.length} available tool${tools.length === 1 ? "" : "s"}`}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-3 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
                        <McpToolsList
                          compact
                          emptyMessage="Connected, but no tools are exposed."
                          tools={tools}
                        />
                      </CollapsibleContent>
                    </Collapsible>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-border/40 bg-muted/20 p-4 text-muted-foreground text-xs leading-relaxed">
        <p className="mb-2 flex items-center gap-1.5 font-medium text-foreground text-sm">
          <GlobeIcon className="size-3.5" />
          Transport guide
        </p>
        <ul className="list-disc space-y-1 pl-4">
          <li>
            <strong>HTTP</strong> — best for production and remote MCP servers
          </li>
          <li>
            <strong>SSE</strong> — alternative HTTP transport for older servers
          </li>
          <li>
            <strong>Stdio</strong> — local processes only; not supported on
            serverless deployments
          </li>
        </ul>
      </div>

      <AlertDialog
        onOpenChange={(open) => !open && setDeletingServer(null)}
        open={Boolean(deletingServer)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove MCP server?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deletingServer?.name}&quot; will be removed. The assistant
              will no longer have access to its tools.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
