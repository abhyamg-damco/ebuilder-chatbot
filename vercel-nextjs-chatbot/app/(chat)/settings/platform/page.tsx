import { PlatformSettings } from "@/components/settings/platform-settings";
import { SettingsShell } from "@/components/settings/settings-shell";

export default function PlatformSettingsPage() {
  return (
    <SettingsShell backHref="/" backLabel="Back to chat">
      <PlatformSettings />
    </SettingsShell>
  );
}
