"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import type {
  CreateMcpServerInput,
  McpServerPublic,
  McpServerTestResult,
  McpTransportType,
} from "@/lib/mcp/types";
import { normalizeStdioConfig } from "@/lib/mcp/utils";
import { fetcher } from "@/lib/utils";
import { McpToolsList } from "./mcp-tools-list";

type KeyValueRow = { key: string; value: string };

export type McpServerFormValues = {
  name: string;
  description: string;
  transport: McpTransportType;
  url: string;
  command: string;
  args: string;
  enabled: boolean;
  headers: KeyValueRow[];
  env: KeyValueRow[];
};

const defaultValues: McpServerFormValues = {
  name: "",
  description: "",
  transport: "http",
  url: "",
  command: "",
  args: "",
  enabled: true,
  headers: [],
  env: [],
};

function rowsFromRecord(record: Record<string, string>): KeyValueRow[] {
  return Object.entries(record).map(([key, value]) => ({ key, value }));
}

function recordFromRows(rows: KeyValueRow[]): Record<string, string> {
  return Object.fromEntries(
    rows
      .filter((row) => row.key.trim().length > 0)
      .map((row) => [row.key.trim(), row.value])
  );
}

function toFormValues(server: McpServerPublic): McpServerFormValues {
  return {
    name: server.name,
    description: server.description ?? "",
    transport: server.transport,
    url: server.url ?? "",
    command: server.command ?? "",
    args: server.args.join(" "),
    enabled: server.enabled,
    headers: server.headerKeys.map((key) => ({
      key,
      value: "",
    })),
    env: rowsFromRecord(server.env).map((row) => ({
      key: row.key,
      value: row.value === "••••••••" ? "" : row.value,
    })),
  };
}

function toPayload(values: McpServerFormValues): CreateMcpServerInput {
  const base = {
    name: values.name.trim(),
    description: values.description.trim() || undefined,
    enabled: values.enabled,
    headers: recordFromRows(values.headers),
    env: recordFromRows(values.env),
  };

  if (values.transport === "stdio") {
    const { command, args } = normalizeStdioConfig(
      values.command.trim(),
      values.args
        .split(/\s+/)
        .map((arg) => arg.trim())
        .filter(Boolean)
    );

    return {
      ...base,
      transport: "stdio",
      command,
      args,
    };
  }

  return {
    ...base,
    transport: values.transport,
    url: values.url.trim(),
  };
}

function KeyValueEditor({
  label,
  description,
  rows,
  onChange,
  valuePlaceholder = "Value",
}: {
  label: string;
  description?: string;
  rows: KeyValueRow[];
  onChange: (rows: KeyValueRow[]) => void;
  valuePlaceholder?: string;
}) {
  return (
    <div className="space-y-2">
      <div>
        <Label>{label}</Label>
        {description ? (
          <p className="text-muted-foreground text-xs">{description}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div className="flex gap-2" key={`${label}-${index}`}>
            <Input
              className="flex-1"
              onChange={(event) => {
                const next = [...rows];
                next[index] = { ...next[index], key: event.target.value };
                onChange(next);
              }}
              placeholder="Key"
              value={row.key}
            />
            <Input
              className="flex-[2]"
              onChange={(event) => {
                const next = [...rows];
                next[index] = { ...next[index], value: event.target.value };
                onChange(next);
              }}
              placeholder={valuePlaceholder}
              value={row.value}
            />
            <Button
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
              size="sm"
              type="button"
              variant="outline"
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
      <Button
        onClick={() => onChange([...rows, { key: "", value: "" }])}
        size="sm"
        type="button"
        variant="outline"
      >
        Add row
      </Button>
    </div>
  );
}

export function McpServerForm({ serverId }: { serverId?: string }) {
  const router = useRouter();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const listHref = `${basePath}/settings/mcp`;

  const { data, isLoading } = useSWR<{ server: McpServerPublic }>(
    serverId ? `${basePath}/api/mcp-servers/${serverId}` : null,
    fetcher
  );

  const server = data?.server;
  const [values, setValues] = useState<McpServerFormValues>(defaultValues);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<McpServerTestResult | null>(
    null
  );
  const hasAutoTestedRef = useRef(false);

  useEffect(() => {
    if (server) {
      setValues(toFormValues(server));
    }
  }, [server]);

  const runConnectionTest = useCallback(
    async (formValues: McpServerFormValues, options?: { silent?: boolean }) => {
      setIsTesting(true);
      setTestResult(null);

      try {
        const payload = toPayload(formValues);
        const endpoint = serverId
          ? `${basePath}/api/mcp-servers/${serverId}/test`
          : `${basePath}/api/mcp-servers/test`;

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            serverId ? { draft: true, config: payload } : payload
          ),
        });

        const result = (await response.json()) as McpServerTestResult;
        setTestResult(result);

        if (!options?.silent) {
          if (result.success) {
            toast({
              type: "success",
              description: `Connected — ${result.toolCount ?? 0} tools available`,
            });
          } else {
            toast({
              type: "error",
              description: result.error ?? "Connection failed",
            });
          }
        }

        return result;
      } catch {
        if (!options?.silent) {
          toast({ type: "error", description: "Failed to test connection" });
        }
        return null;
      } finally {
        setIsTesting(false);
      }
    },
    [basePath, serverId]
  );

  useEffect(() => {
    if (!serverId || !server || hasAutoTestedRef.current) {
      return;
    }

    hasAutoTestedRef.current = true;
    void runConnectionTest(toFormValues(server), { silent: true });
  }, [runConnectionTest, server, serverId]);

  const handleTest = async () => {
    await runConnectionTest(values);
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const payload = toPayload(values);
      const endpoint = serverId
        ? `${basePath}/api/mcp-servers/${serverId}`
        : `${basePath}/api/mcp-servers`;

      const response = await fetch(endpoint, {
        method: serverId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.message ?? "Failed to save MCP server");
      }

      toast({
        type: "success",
        description: serverId ? "MCP server updated" : "MCP server added",
      });
      router.push(listHref);
      router.refresh();
    } catch (error) {
      toast({
        type: "error",
        description:
          error instanceof Error ? error.message : "Failed to save MCP server",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (serverId && isLoading) {
    return (
      <div className="flex items-center justify-center p-16 text-muted-foreground text-sm">
        Loading server…
      </div>
    );
  }

  if (serverId && !isLoading && !server) {
    return (
      <div className="mx-auto max-w-2xl p-6 md:p-10">
        <p className="text-destructive text-sm">MCP server not found.</p>
        <Button
          className="mt-4"
          onClick={() => router.push(listHref)}
          variant="outline"
        >
          Back to MCP servers
        </Button>
      </div>
    );
  }

  const isRemoteTransport =
    values.transport === "http" || values.transport === "sse";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6 md:p-10">
      <div className="space-y-1">
        <h1 className="font-semibold text-xl tracking-tight">
          {serverId ? "Edit MCP server" : "Add MCP server"}
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Connect external tools via the Model Context Protocol. HTTP is
          recommended for production; stdio works for local development only.
        </p>
      </div>

      <div className="space-y-5 rounded-xl border border-border/60 bg-card/50 p-6">
        <div className="space-y-2">
          <Label htmlFor="mcp-name">Name</Label>
          <Input
            id="mcp-name"
            onChange={(event) =>
              setValues((current) => ({ ...current, name: event.target.value }))
            }
            placeholder="e.g. Linear, Notion, GitHub"
            value={values.name}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mcp-description">Description (optional)</Label>
          <Textarea
            id="mcp-description"
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            placeholder="What does this server provide?"
            rows={2}
            value={values.description}
          />
        </div>

        <div className="space-y-2">
          <Label>Transport</Label>
          <Select
            onValueChange={(transport: McpTransportType) =>
              setValues((current) => ({ ...current, transport }))
            }
            value={values.transport}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="http">HTTP (recommended)</SelectItem>
              <SelectItem value="sse">SSE</SelectItem>
              <SelectItem value="stdio">Stdio (local only)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isRemoteTransport ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="mcp-url">Server URL</Label>
              <Input
                id="mcp-url"
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    url: event.target.value,
                  }))
                }
                placeholder="https://example.com/mcp"
                value={values.url}
              />
            </div>
            <KeyValueEditor
              description='Request headers sent to the MCP server. Use ${VAR_NAME} to reference environment variables (e.g. Authorization: Bearer ${VAPI_TOKEN})'
              label="HTTP headers"
              onChange={(headers) =>
                setValues((current) => ({ ...current, headers }))
              }
              rows={values.headers}
              valuePlaceholder={
                serverId ? "Leave blank to keep existing value" : "Value"
              }
            />
            <KeyValueEditor
              description="Environment variables for this server (e.g. API keys referenced by the MCP client)"
              label="Environment variables"
              onChange={(env) => setValues((current) => ({ ...current, env }))}
              rows={values.env}
              valuePlaceholder={
                serverId ? "Leave blank to keep existing value" : "Value"
              }
            />
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="mcp-command">Command</Label>
              <Input
                id="mcp-command"
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    command: event.target.value,
                  }))
                }
                placeholder="npx"
                value={values.command}
              />
              <p className="text-muted-foreground text-xs">
                Use the executable only (e.g. <code className="font-mono">npx</code>
                ), or paste the full command — we split it automatically.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mcp-args">Arguments</Label>
              <Input
                id="mcp-args"
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    args: event.target.value,
                  }))
                }
                placeholder="-y @modelcontextprotocol/server-everything"
                value={values.args}
              />
            </div>
            <KeyValueEditor
              description="Environment variables passed to the process"
              label="Environment variables"
              onChange={(env) => setValues((current) => ({ ...current, env }))}
              rows={values.env}
            />
          </>
        )}

        <div className="flex items-center gap-2">
          <input
            checked={values.enabled}
            className="size-4 rounded border border-border"
            id="mcp-enabled"
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                enabled: event.target.checked,
              }))
            }
            type="checkbox"
          />
          <Label htmlFor="mcp-enabled">Enabled for chat</Label>
        </div>

        {testResult ? (
          <div
            className={`rounded-lg border p-4 text-sm ${
              testResult.success
                ? "border-green-500/30 bg-green-500/5"
                : "border-destructive/30 bg-destructive/5"
            }`}
          >
            {testResult.success ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="font-medium text-green-700 dark:text-green-400">
                    Connection successful
                  </p>
                  {testResult.serverInfo ? (
                    <p className="text-muted-foreground text-xs">
                      {testResult.serverInfo.name || "MCP server"}
                      {testResult.serverInfo.version
                        ? ` · v${testResult.serverInfo.version}`
                        : ""}
                    </p>
                  ) : null}
                </div>
                <McpToolsList
                  emptyMessage="Connected, but this server does not expose any tools."
                  tools={testResult.tools ?? []}
                />
              </div>
            ) : (
              <p className="text-destructive">{testResult.error}</p>
            )}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          disabled={isSaving || isTesting}
          onClick={() => router.push(listHref)}
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
        <Button
          disabled={isTesting || isSaving}
          onClick={handleTest}
          type="button"
          variant="outline"
        >
          {isTesting ? (
            <span className="flex items-center gap-2">
              <LoaderIcon />
              Testing…
            </span>
          ) : (
            "Test connection"
          )}
        </Button>
        <Button disabled={isSaving || isTesting} onClick={handleSave} type="button">
          {isSaving ? "Saving…" : serverId ? "Save changes" : "Add server"}
        </Button>
      </div>
    </div>
  );
}
