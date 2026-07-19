import { PersonaForm } from "@/components/settings/persona-form";
import { SettingsShell } from "@/components/settings/settings-shell";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPersonaPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <SettingsShell backHref="/settings/personas" backLabel="Back to personas">
      <PersonaForm personaId={id} />
    </SettingsShell>
  );
}
