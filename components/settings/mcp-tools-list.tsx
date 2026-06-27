"use client";

import { WrenchIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { humanizeIdentifier } from "@/lib/mcp/utils";

type McpToolInfo = {
  name: string;
  description?: string;
};

type McpToolsListProps = {
  tools: McpToolInfo[];
  compact?: boolean;
  emptyMessage?: string;
};

/**
 * Readable list of tools exposed by an MCP server.
 */
export function McpToolsList({
  tools,
  compact = false,
  emptyMessage = "No tools exposed by this server.",
}: McpToolsListProps) {
  if (tools.length === 0) {
    return (
      <p className="text-muted-foreground text-xs leading-relaxed">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <WrenchIcon className="size-3.5 text-muted-foreground" />
        <span className="font-medium text-foreground text-xs">
          Available tools
        </span>
        <Badge className="h-5 px-1.5 text-[10px]" variant="secondary">
          {tools.length}
        </Badge>
      </div>
      <ul
        className={
          compact
            ? "max-h-40 space-y-1.5 overflow-y-auto"
            : "max-h-72 space-y-2 overflow-y-auto rounded-lg border border-border/50 bg-muted/20 p-3"
        }
      >
        {tools.map((tool) => (
          <li
            className={
              compact
                ? "text-muted-foreground text-xs leading-relaxed"
                : "rounded-md border border-border/30 bg-background/80 px-3 py-2"
            }
            key={tool.name}
          >
            <p className="font-medium text-foreground text-sm">
              {humanizeIdentifier(tool.name)}
            </p>
            {tool.description ? (
              <p className="mt-0.5 text-muted-foreground text-xs leading-relaxed">
                {tool.description}
              </p>
            ) : (
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/70">
                {tool.name}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
