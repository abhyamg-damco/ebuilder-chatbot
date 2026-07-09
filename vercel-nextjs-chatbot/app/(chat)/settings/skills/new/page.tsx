import { SkillForm } from "@/components/settings/skill-form";
import { SettingsShell } from "@/components/settings/settings-shell";

export default function NewSkillPage() {
  return (
    <SettingsShell backHref="/settings/skills" backLabel="Back to skills">
      <SkillForm />
    </SettingsShell>
  );
}
