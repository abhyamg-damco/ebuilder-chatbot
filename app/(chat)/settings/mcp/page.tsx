import { McpServersSettings } from "@/components/settings/mcp-servers-settings";
import { SettingsShell } from "@/components/settings/settings-shell";

export default function McpSettingsPage() {
  return (
    <SettingsShell backHref="/" backLabel="Back to chat">
      <McpServersSettings />
    </SettingsShell>
  );
}
