import { SkillsSettings } from "@/components/settings/skills-settings";
import { SettingsShell } from "@/components/settings/settings-shell";

export default function SkillsSettingsPage() {
  return (
    <SettingsShell backHref="/" backLabel="Back to chat">
      <SkillsSettings />
    </SettingsShell>
  );
}
