"use client";

import {
  AlertCircleIcon,
  CheckCircle2Icon,
  Loader2Icon,
  WifiOffIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { McpServerStatus } from "@/lib/mcp/types";

type McpConnectionStatusProps = {
  status?: McpServerStatus | null;
  isChecking?: boolean;
  showToolCount?: boolean;
  className?: string;
};

/**
 * Connection status badge for an MCP server on the settings list.
 */
export function McpConnectionStatus({
  status,
  isChecking = false,
  showToolCount = true,
  className,
}: McpConnectionStatusProps) {
  if (isChecking || !status) {
    return (
      <Badge
        className={cn("gap-1.5 border-amber-500/20 bg-amber-500/10", className)}
        variant="outline"
      >
        <Loader2Icon className="size-3 animate-spin text-amber-600" />
        Checking…
      </Badge>
    );
  }

  if (status.success) {
    return (
      <Badge
        className={cn("gap-1.5 border-emerald-500/20 bg-emerald-500/10", className)}
        variant="outline"
      >
        <CheckCircle2Icon className="size-3 text-emerald-600" />
        Connected
        {showToolCount && status.toolCount !== undefined ? (
          <span className="text-muted-foreground">
            · {status.toolCount} tool{status.toolCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </Badge>
    );
  }

  return (
    <Badge
      className={cn("gap-1.5 border-destructive/20 bg-destructive/5", className)}
      title={status.error}
      variant="outline"
    >
      <WifiOffIcon className="size-3 text-destructive" />
      Unreachable
    </Badge>
  );
}

type McpConnectionErrorProps = {
  status: McpServerStatus;
};

/** Inline error detail when a server fails its health check. */
export function McpConnectionError({ status }: McpConnectionErrorProps) {
  if (status.success || !status.error) {
    return null;
  }

  return (
    <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-destructive text-xs leading-relaxed">
      <AlertCircleIcon className="mt-0.5 size-3.5 shrink-0" />
      <span>{status.error}</span>
    </div>
  );
}
