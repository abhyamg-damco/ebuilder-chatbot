import { SecretForm } from "@/components/settings/secret-form";
import { SettingsShell } from "@/components/settings/settings-shell";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditSecretPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <SettingsShell backHref="/settings/secrets" backLabel="Back to secrets">
      <SecretForm secretId={id} />
    </SettingsShell>
  );
}
