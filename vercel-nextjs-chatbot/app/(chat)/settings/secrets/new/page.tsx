import { SecretForm } from "@/components/settings/secret-form";
import { SettingsShell } from "@/components/settings/settings-shell";

export default function NewSecretPage() {
  return (
    <SettingsShell backHref="/settings/secrets" backLabel="Back to secrets">
      <SecretForm />
    </SettingsShell>
  );
}
