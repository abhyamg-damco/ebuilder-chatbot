import { InsightsSettings } from "@/components/settings/insights-settings";
import { SettingsShell } from "@/components/settings/settings-shell";

export default function InsightsPage() {
  return (
    <SettingsShell backHref="/" backLabel="Back to chat">
      <InsightsSettings />
    </SettingsShell>
  );
}
