export const WEEKLY_UPDATE_FIELDS = [
  "Bi-Weekly Comment Date", "Bi-Weekly Comments", "Physical Construction Percentage",
  "General Update", "Next External Stakeholder Meeting", "Activities Completed This Period",
  "Incurred Delay (Days)", "Delay Cause #1", "Delay Cause #1 Details & Remediation",
  "Delay Cause #2", "Delay Cause #2 Details & Remediation", "New Instruction Given to any Vendors",
  "Changes to Baseline or Forecast Schedule", "Major Upcoming Risks", "Mitigation of Upcoming Risks",
] as const;

export type WeeklyFieldName = (typeof WEEKLY_UPDATE_FIELDS)[number];
export type DataField = { name?: string; value?: unknown };

export function cleanFormFields(details: unknown): Array<{ name: string; value: unknown }> {
  if (!Array.isArray(details)) return [];
  return details.flatMap((item) => {
    const field = item as DataField;
    if (!field.name || field.name === '"' || field.name === '""') return [];
    return [{ name: field.name, value: field.value ?? null }];
  });
}

export function confirmationSentence(projectId: string, commentDate: string): string {
  return `I confirm submission of the weekly update for project ${projectId} dated ${commentDate}.`;
}

export function isValidWeeklyDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}
