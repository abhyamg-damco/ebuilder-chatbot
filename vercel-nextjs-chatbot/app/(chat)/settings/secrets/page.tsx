import { SecretsSettings } from "@/components/settings/secrets-settings";
import { SettingsShell } from "@/components/settings/settings-shell";

export default function SecretsSettingsPage() {
  return (
    <SettingsShell backHref="/" backLabel="Back to chat">
      <SecretsSettings />
    </SettingsShell>
  );
}
