export const WEEKLY_UPDATE_FIELDS = [
  "Bi-Weekly Comment Date", "Bi-Weekly Comments", "Physical Construction Percentage",
  "General Update", "Next External Stakeholder Meeting", "Activities Completed This Period",
  "Incurred Delay (Days)", "Delay Cause #1", "Delay Cause #1 Details & Remediation",
  "Delay Cause #2", "Delay Cause #2 Details & Remediation", "New Instruction Given to any Vendors",
  "Changes to Baseline or Forecast Schedule", "Major Upcoming Risks", "Mitigation of Upcoming Risks",
] as const;

export type WeeklyFieldName = (typeof WEEKLY_UPDATE_FIELDS)[number];
export type DataField = { name?: string; value?: unknown };
export type ProjectSearchPattern = { label: string; value: string };

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

/** An empty allowlist is intentionally unrestricted; a non-empty list is restrictive. */
export function isWriteProjectAllowed(allowedProjectIds: readonly string[], projectId: string): boolean {
  return allowedProjectIds.length === 0 || allowedProjectIds.includes(projectId);
}

export function isValidWeeklyDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

/**
 * e-Builder Project Query supports LIKE, not regular expressions. These
 * bounded fallbacks make spoken variants such as "Kanija Taneja testing"
 * discoverable without issuing an unbounded tenant-wide search.
 */
export function projectSearchPatterns(reference: string): ProjectSearchPattern[] {
  const raw = reference.trim().replace(/\s+/g, " ");
  const tokens = normaliseProjectText(raw).split(" ").filter(Boolean);
  const stems = tokens.map((token) => token.replace(/ing$/, "")).filter((token) => token.length >= 3);
  const significant = tokens.filter((token) => !["project", "the", "for", "and"].includes(token));
  const patterns: ProjectSearchPattern[] = [
    { label: "spoken phrase", value: raw },
    ...(tokens.length > 1 ? [{ label: "all spoken words", value: tokens.join("%") }] : []),
    ...significant.slice(0, 3).map((token) => ({ label: `keyword:${token}`, value: token })),
    ...stems.filter((stem, index) => stem !== tokens[index]).slice(0, 2).map((stem) => ({ label: `word stem:${stem}`, value: stem })),
  ];
  const seen = new Set<string>();
  return patterns.filter((pattern) => pattern.value.length >= 2 && !seen.has(pattern.value.toLowerCase()) && (seen.add(pattern.value.toLowerCase()), true)).slice(0, 6);
}

export function projectMatchScore(reference: string, projectName: string): number {
  const wanted = normaliseProjectText(reference).split(" ").filter(Boolean).map(stemToken);
  const available = normaliseProjectText(projectName).split(" ").filter(Boolean).map(stemToken);
  if (!wanted.length || !available.length) return 0;
  const score = wanted.reduce((total, token) => total + Math.max(...available.map((candidate) => tokenSimilarity(token, candidate))), 0) / wanted.length;
  return Math.round(score * 100) / 100;
}

function normaliseProjectText(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function stemToken(token: string): string { return token.replace(/ing$/, ""); }
function tokenSimilarity(left: string, right: string): number {
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return Math.min(left.length, right.length) / Math.max(left.length, right.length);
  const distance = levenshtein(left, right);
  return Math.max(0, 1 - distance / Math.max(left.length, right.length));
}
function levenshtein(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const above = previous[j];
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (left[i - 1] === right[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return previous[right.length];
}
