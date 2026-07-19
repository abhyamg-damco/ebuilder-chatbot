import { PersonaForm } from "@/components/settings/persona-form";
import { SettingsShell } from "@/components/settings/settings-shell";

export default function NewPersonaPage() {
  return (
    <SettingsShell backHref="/settings/personas" backLabel="Back to personas">
      <PersonaForm />
    </SettingsShell>
  );
}
