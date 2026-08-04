import type { EBuilderClient } from "./client.js";
import { buildQueryParams, buildQueryPath } from "./resources.js";

export type ProjectMatchConfidence = "exact" | "strong" | "partial";

export interface ProjectMatch {
  projectName?: string;
  portalId?: string;
  urlSafeName?: string;
  status?: string;
  customFields?: Record<string, unknown>;
  /** The e-Builder field that returned this project. */
  matchedBy: string;
  /** The search variant that returned this project. */
  matchedSearchTerm: string;
  /** Confidence derived from normalized values in the returned record. */
  matchConfidence: ProjectMatchConfidence;
  raw: unknown;
}

export interface ProjectSearchResult {
  searchTerm: string;
  /** Canonical, punctuation-insensitive form used to compare project references. */
  normalizedSearchTerm: string;
  /** Original and normalized terms tried against e-Builder. */
  searchTermsTried: string[];
  strategiesAttempted: string[];
  matches: ProjectMatch[];
  suggestedFilters: Array<{
    Field: string;
    Operation: string;
    Value: string;
  }>;
}

const DEFAULT_SELECTED_FIELDS = [
  "Project/ProjectName",
  "Project/PortalId",
  "Project/UrlSafeName",
  "Project/Status",
  "Project/CustomFields/Project ID",
  "Project/CustomFields/Oracle Project Number",
  "Project/CustomFields/MASTER PROJECT NUMBER",
];

const VOICE_DIGITS: Record<string, string> = {
  zero: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
};

/** Build a LIKE filter pattern for fuzzy name matching. */
function likePattern(term: string): string {
  const trimmed = term.trim();
  return trimmed.includes("%") ? trimmed : `%${trimmed}%`;
}

/** Remove transcription punctuation and normalize voice-spelled single digits. */
function normalizeVoiceWords(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[‐‑‒–—―]/g, "-")
    .toLowerCase()
    .replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine)\b/g, (word) =>
      VOICE_DIGITS[word] ?? word
    )
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Comparable representation for codes, names, and custom-field values. */
export function normalizeProjectReference(value: string): string {
  return normalizeVoiceWords(value).replace(/\s+/g, "").toUpperCase();
}

/** Extract a likely project reference when a host sends a whole spoken utterance. */
function extractProjectReference(value: string): string | undefined {
  const trimmed = value.trim().replace(/[?!.]+$/, "");
  const accessMatch = trimmed.match(/\baccess\s+to\s+(?:the\s+)?(.+)$/i);
  const explicitProjectMatch = trimmed.match(
    /\bproject(?:\s+(?:number|code|id|name))?\s+(?:is\s+|called\s+)?(.+)$/i
  );
  const candidate = accessMatch?.[1] ?? explicitProjectMatch?.[1];
  if (!candidate) return undefined;

  const reference = candidate
    .replace(/\b(?:please|thanks?)\b.*$/i, "")
    .replace(/\s+project$/i, "")
    .trim();
  return reference || undefined;
}

/**
 * Build a small, deterministic set of useful e-Builder search terms from a
 * raw voice transcript. For example, "E. SRI 00. 6A" becomes ESRI006A,
 * "ESRI 006A", and "ESRI-006A" while preserving the original input.
 */
export function buildProjectSearchVariants(searchTerm: string): string[] {
  const original = searchTerm.trim().replace(/\s+/g, " ");
  const normalizedWords = normalizeVoiceWords(original);
  const compact = normalizeProjectReference(original);
  const variants: string[] = [];

  const add = (value: string) => {
    const candidate = value.trim().replace(/\s+/g, " ");
    if (candidate && !variants.some((existing) => existing.toUpperCase() === candidate.toUpperCase())) {
      variants.push(candidate);
    }
  };

  add(original);
  add(normalizedWords);

  const extractedReference = extractProjectReference(original);
  const extractedCompact = extractedReference
    ? normalizeProjectReference(extractedReference)
    : compact;

  // Project-code shape: letters followed by a numeric code with an optional suffix.
  // Prioritize code forms so a complete voice utterance still probes each one.
  const code = extractedCompact.match(/^([A-Z]{2,})(\d+[A-Z]?)$/);
  if (code) {
    const [, prefix, suffix] = code;
    add(`${prefix} ${suffix}`);
    add(`${prefix}-${suffix}`);
    add(`${prefix}${suffix}`);
  } else if (extractedReference) {
    add(extractedReference);
    add(normalizeVoiceWords(extractedReference));
  }

  return variants.slice(0, 5);
}

function extractRecords(data: unknown): unknown[] {
  if (!data || typeof data !== "object") {
    return [];
  }
  const records = (data as { records?: unknown[] }).records;
  return Array.isArray(records) ? records : [];
}

function readPath(record: Record<string, unknown>, path: string): unknown {
  return path.split("/").reduce<unknown>((value, segment) => {
    if (!value || typeof value !== "object") {
      return undefined;
    }
    return (value as Record<string, unknown>)[segment];
  }, record);
}

function confidenceFor(
  record: Record<string, unknown>,
  field: string,
  searchTerm: string
): ProjectMatchConfidence {
  const target = normalizeProjectReference(searchTerm);
  if (!target) {
    return "partial";
  }

  const value = readPath(record, field);
  if (typeof value === "string") {
    const normalizedValue = normalizeProjectReference(value);
    if (normalizedValue === target) {
      return "exact";
    }
    if (normalizedValue.includes(target) || target.includes(normalizedValue)) {
      return "strong";
    }
  }
  return "partial";
}

function normalizeMatch(
  record: unknown,
  matchedBy: string,
  matchedSearchTerm: string
): ProjectMatch | null {
  if (!record || typeof record !== "object") {
    return null;
  }

  const typedRecord = record as Record<string, unknown>;
  const project = typedRecord.Project as Record<string, unknown> | undefined;
  if (!project) {
    return null;
  }

  return {
    projectName: project.ProjectName as string | undefined,
    portalId: project.PortalId as string | undefined,
    urlSafeName: project.UrlSafeName as string | undefined,
    status: project.Status as string | undefined,
    customFields: project.CustomFields as Record<string, unknown> | undefined,
    matchedBy,
    matchedSearchTerm,
    matchConfidence: confidenceFor(typedRecord, matchedBy, matchedSearchTerm),
    raw: record,
  };
}

/** Extract filterable custom-field paths from Projects query schema. */
function extractCustomFieldPaths(schema: unknown): string[] {
  const paths: string[] = [];
  try {
    const customFields =
      (schema as { properties?: { records?: { items?: { properties?: { Project?: { properties?: { CustomFields?: { properties?: Record<string, unknown> } } } } } } } })
        .properties?.records?.items?.properties?.Project?.properties
        ?.CustomFields?.properties;

    if (customFields) {
      for (const key of Object.keys(customFields)) {
        if (/project\s*id|project\s*number|oracle|master\s*project/i.test(key)) {
          paths.push(`Project/CustomFields/${key}`);
        }
      }
    }
  } catch {
    // Schema shape varies; fall back to defaults.
  }

  return paths;
}

async function runProjectQuery(
  client: EBuilderClient,
  filters: Array<{ Field: string; Operation: string; Value: string }>,
  selectedFields: string[],
  maxResults: number
): Promise<unknown[]> {
  try {
    const path = buildQueryPath("Projects");
    const params = buildQueryParams({ schema: false, pageNumber: 0, pageSize: maxResults });
    const data = await client.post(path, { SelectedFields: selectedFields, Filters: filters }, params);
    return extractRecords(data);
  } catch {
    // Some field/operation combinations are invalid per tenant schema — keep searching.
    return [];
  }
}

function confidenceScore(confidence: ProjectMatchConfidence): number {
  return { exact: 3, strong: 2, partial: 1 }[confidence];
}

function fieldScore(field: string): number {
  if (field.includes("CustomFields")) return 3;
  if (field.endsWith("UrlSafeName")) return 2;
  return 1;
}

/**
 * Multi-strategy project search for display names, codes, custom IDs, and raw
 * voice transcripts. It intentionally has no static nickname-to-code mapping:
 * e-Builder project data remains the source of truth.
 */
export async function searchProjects(
  client: EBuilderClient,
  searchTerm: string,
  maxResults = 10
): Promise<ProjectSearchResult> {
  const strategiesAttempted: string[] = [];
  const variants = buildProjectSearchVariants(searchTerm);
  const term = searchTerm.trim();
  const seen = new Map<string, ProjectMatch>();

  const addMatches = (records: unknown[], field: string, variant: string) => {
    for (const record of records) {
      const match = normalizeMatch(record, field, variant);
      const key = match?.portalId ?? JSON.stringify(record);
      if (!match) continue;

      const existing = seen.get(key);
      if (
        !existing ||
        confidenceScore(match.matchConfidence) > confidenceScore(existing.matchConfidence) ||
        (confidenceScore(match.matchConfidence) === confidenceScore(existing.matchConfidence) &&
          fieldScore(match.matchedBy) > fieldScore(existing.matchedBy))
      ) {
        seen.set(key, match);
      }
    }
  };

  const searchField = async (field: string, selectedFields: string[]) => {
    for (const variant of variants) {
      strategiesAttempted.push(`${field} LIKE (${variant})`);
      addMatches(
        await runProjectQuery(
          client,
          [{ Field: field, Operation: "LIKE", Value: likePattern(variant) }],
          selectedFields,
          maxResults
        ),
        field,
        variant
      );
    }
  };

  await searchField("Project/ProjectName", DEFAULT_SELECTED_FIELDS);
  await searchField("Project/UrlSafeName", DEFAULT_SELECTED_FIELDS);

  let customFieldPaths: string[] = [];
  try {
    const schema = await client.post(
      buildQueryPath("Projects"),
      {},
      buildQueryParams({ schema: true, pageNumber: 0, pageSize: 0 })
    );
    customFieldPaths = extractCustomFieldPaths(schema);
  } catch {
    customFieldPaths = [];
  }

  const fieldsToSearch = customFieldPaths.length > 0
    ? customFieldPaths
    : [
        "Project/CustomFields/Project ID",
        "Project/CustomFields/Oracle Project Number",
        "Project/CustomFields/MASTER PROJECT NUMBER",
      ];

  for (const field of fieldsToSearch) {
    await searchField(field, [...DEFAULT_SELECTED_FIELDS, field]);
  }

  // If a multiword nickname did not match as a phrase, try its meaningful words
  // against names and project IDs before asking the caller for an official reference.
  if (seen.size === 0 && variants.length > 0) {
    const tokens = normalizeVoiceWords(term).split(" ").filter((token) => token.length >= 3);
    for (const token of tokens.slice(0, 4)) {
      for (const field of ["Project/ProjectName", ...fieldsToSearch]) {
        strategiesAttempted.push(`${field} LIKE token (${token})`);
        addMatches(
          await runProjectQuery(
            client,
            [{ Field: field, Operation: "LIKE", Value: likePattern(token) }],
            [...DEFAULT_SELECTED_FIELDS, field],
            maxResults
          ),
          field,
          token
        );
      }
    }
  }

  const matches = [...seen.values()]
    .sort((a, b) =>
      confidenceScore(b.matchConfidence) - confidenceScore(a.matchConfidence) ||
      fieldScore(b.matchedBy) - fieldScore(a.matchedBy) ||
      (a.projectName ?? "").localeCompare(b.projectName ?? "")
    )
    .slice(0, maxResults);

  const suggestedFilters: ProjectSearchResult["suggestedFilters"] = [];
  if (matches.length > 0) {
    const best = matches[0];
    if (best.portalId) {
      suggestedFilters.push({ Field: "Project/PortalId", Operation: "LIKE", Value: best.portalId });
    }
    if (best.projectName) {
      suggestedFilters.push({ Field: "Project/ProjectName", Operation: "LIKE", Value: likePattern(best.projectName) });
    }
  } else {
    for (const fieldPath of fieldsToSearch.slice(0, 3)) {
      for (const variant of variants.slice(0, 2)) {
        suggestedFilters.push({ Field: fieldPath, Operation: "LIKE", Value: likePattern(variant) });
      }
    }
  }

  return {
    searchTerm: term,
    normalizedSearchTerm: normalizeProjectReference(term),
    searchTermsTried: variants,
    strategiesAttempted,
    matches,
    suggestedFilters,
  };
}
