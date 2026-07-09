import { SkillForm } from "@/components/settings/skill-form";
import { SettingsShell } from "@/components/settings/settings-shell";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditSkillPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <SettingsShell backHref="/settings/skills" backLabel="Back to skills">
      <SkillForm skillId={id} />
    </SettingsShell>
  );
}
