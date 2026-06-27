import { McpServerForm } from "@/components/settings/mcp-server-form";
import { SettingsShell } from "@/components/settings/settings-shell";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditMcpServerPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <SettingsShell backHref="/settings/mcp" backLabel="Back to MCP servers">
      <McpServerForm serverId={id} />
    </SettingsShell>
  );
}
