import { McpServerForm } from "@/components/settings/mcp-server-form";
import { SettingsShell } from "@/components/settings/settings-shell";

export default function NewMcpServerPage() {
  return (
    <SettingsShell backHref="/settings/mcp" backLabel="Back to MCP servers">
      <McpServerForm />
    </SettingsShell>
  );
}
