import type { EBuilderClient } from "./client.js";
import { buildQueryParams, buildQueryPath } from "./resources.js";

export interface ProjectMatch {
  projectName?: string;
  portalId?: string;
  urlSafeName?: string;
  status?: string;
  customFields?: Record<string, unknown>;
  matchedBy: string;
  raw: unknown;
}

export interface ProjectSearchResult {
  searchTerm: string;
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

/** Build a LIKE filter pattern for fuzzy matching. */
function likePattern(term: string): string {
  const trimmed = term.trim();
  return trimmed.includes("%") ? trimmed : `%${trimmed}%`;
}

function extractRecords(data: unknown): unknown[] {
  if (!data || typeof data !== "object") {
    return [];
  }
  const records = (data as { records?: unknown[] }).records;
  return Array.isArray(records) ? records : [];
}

function normalizeMatch(record: unknown, matchedBy: string): ProjectMatch | null {
  if (!record || typeof record !== "object") {
    return null;
  }

  const project = (record as { Project?: Record<string, unknown> }).Project;
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
        if (
          /project\s*id|project\s*number|oracle|master\s*project/i.test(key)
        ) {
          paths.push(`Project/CustomFields/${key}`);
        }
      }
    }
  } catch {
    // Schema shape varies; fall back to defaults
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
    const params = buildQueryParams({
      schema: false,
      pageNumber: 0,
      pageSize: maxResults,
    });

    const data = await client.post(
      path,
      { SelectedFields: selectedFields, Filters: filters },
      params
    );

    return extractRecords(data);
  } catch {
    // Some field/operation combos are invalid per tenant schema — skip silently
    return [];
  }
}

/**
 * Multi-strategy project search: name, code, custom fields (e.g. "ESRI 005").
 * Returns matches plus ready-to-use Filters for downstream query_records calls.
 */
export async function searchProjects(
  client: EBuilderClient,
  searchTerm: string,
  maxResults = 10
): Promise<ProjectSearchResult> {
  const strategiesAttempted: string[] = [];
  const seen = new Set<string>();
  const matches: ProjectMatch[] = [];

  const addMatches = (records: unknown[], matchedBy: string) => {
    for (const record of records) {
      const match = normalizeMatch(record, matchedBy);
      const key = match?.portalId ?? JSON.stringify(record);
      if (match && !seen.has(key)) {
        seen.add(key);
        matches.push(match);
      }
    }
  };

  const term = searchTerm.trim();
  const like = likePattern(term);

  // Strategy 1: project display name
  strategiesAttempted.push("Project/ProjectName LIKE");
  addMatches(
    await runProjectQuery(
      client,
      [{ Field: "Project/ProjectName", Operation: "LIKE", Value: like }],
      DEFAULT_SELECTED_FIELDS,
      maxResults
    ),
    "Project/ProjectName"
  );

  // Strategy 2: URL-safe name / code
  if (matches.length < maxResults) {
    strategiesAttempted.push("Project/UrlSafeName LIKE");
    addMatches(
      await runProjectQuery(
        client,
        [{ Field: "Project/UrlSafeName", Operation: "LIKE", Value: like }],
        DEFAULT_SELECTED_FIELDS,
        maxResults
      ),
      "Project/UrlSafeName"
    );
  }

  // Strategy 3: discover tenant custom fields from schema, then search each
  let customFieldPaths: string[] = [];
  try {
    const schemaPath = buildQueryPath("Projects");
    const schemaParams = buildQueryParams({
      schema: true,
      pageNumber: 0,
      pageSize: 0,
    });
    const schema = await client.post(schemaPath, {}, schemaParams);
    customFieldPaths = extractCustomFieldPaths(schema);
  } catch {
    customFieldPaths = [];
  }

  const fieldsToSearch =
    customFieldPaths.length > 0
      ? customFieldPaths
      : [
          "Project/CustomFields/Project ID",
          "Project/CustomFields/Oracle Project Number",
          "Project/CustomFields/MASTER PROJECT NUMBER",
        ];

  for (const fieldPath of fieldsToSearch) {
    if (matches.length >= maxResults) {
      break;
    }

    strategiesAttempted.push(`${fieldPath} LIKE`);
    addMatches(
      await runProjectQuery(
        client,
        [{ Field: fieldPath, Operation: "LIKE", Value: like }],
        [...DEFAULT_SELECTED_FIELDS, fieldPath],
        maxResults
      ),
      fieldPath
    );

    // Also try exact match via LIKE without wildcards (EQ is not supported on all fields)
    if (!term.includes("%")) {
      strategiesAttempted.push(`${fieldPath} exact LIKE`);
      addMatches(
        await runProjectQuery(
          client,
          [{ Field: fieldPath, Operation: "LIKE", Value: term }],
          [...DEFAULT_SELECTED_FIELDS, fieldPath],
          maxResults
        ),
        `${fieldPath} (exact)`
      );
    }
  }

  // Strategy 4: token split — "ESRI 005" → search each token on custom fields
  const tokens = term.split(/\s+/).filter((t) => t.length >= 2);
  if (tokens.length > 1) {
    for (const token of tokens) {
      for (const fieldPath of fieldsToSearch) {
        if (matches.length >= maxResults) {
          break;
        }
        strategiesAttempted.push(`${fieldPath} LIKE token:${token}`);
        addMatches(
          await runProjectQuery(
            client,
            [
              {
                Field: fieldPath,
                Operation: "LIKE",
                Value: likePattern(token),
              },
            ],
            [...DEFAULT_SELECTED_FIELDS, fieldPath],
            maxResults
          ),
          `${fieldPath} (token: ${token})`
        );
      }
    }
  }

  const suggestedFilters: ProjectSearchResult["suggestedFilters"] = [];

  if (matches.length > 0) {
    const best = matches[0];
    if (best.portalId) {
      suggestedFilters.push({
        Field: "Project/PortalId",
        Operation: "LIKE",
        Value: best.portalId,
      });
    }
    if (best.projectName) {
      suggestedFilters.push({
        Field: "Project/ProjectName",
        Operation: "LIKE",
        Value: likePattern(best.projectName),
      });
    }
  } else {
    for (const fieldPath of fieldsToSearch.slice(0, 3)) {
      suggestedFilters.push({
        Field: fieldPath,
        Operation: "LIKE",
        Value: like,
      });
    }
  }

  return {
    searchTerm: term,
    strategiesAttempted,
    matches: matches.slice(0, maxResults),
    suggestedFilters,
  };
}
