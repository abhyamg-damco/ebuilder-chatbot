import { PersonasSettings } from "@/components/settings/personas-settings";
import { SettingsShell } from "@/components/settings/settings-shell";

export default function PersonasSettingsPage() {
  return (
    <SettingsShell backHref="/" backLabel="Back to chat">
      <PersonasSettings />
    </SettingsShell>
  );
}
