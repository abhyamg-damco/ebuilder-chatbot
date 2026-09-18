import assert from "node:assert/strict";
import test from "node:test";
import type { EBuilderClient } from "./client.js";
import {
  buildProjectSearchVariants,
  normalizeProjectReference,
  searchProjects,
} from "./project-search.js";

type QueryBody = {
  Filters?: Array<{ Field: string; Value: string }>;
};

const exactProject = {
  Project: {
    ProjectName: "Second Floor Cleaning",
    PortalId: "project-006a",
    UrlSafeName: "second-floor-cleaning",
    CustomFields: { "Project ID": "ESRI-006A" },
  },
};

function mockClient(respond: (body: QueryBody, params?: Record<string, unknown>) => unknown): EBuilderClient {
  return {
    post: async (_path: string, body?: unknown, params?: Record<string, unknown>) =>
      respond((body ?? {}) as QueryBody, params),
  } as unknown as EBuilderClient;
}

test("normalizes spoken and punctuated project codes into equivalent variants", () => {
  assert.equal(normalizeProjectReference("E. SRI 00. 6A"), "ESRI006A");
  assert.equal(normalizeProjectReference("ESRI zero zero six A"), "ESRI006A");

  const variants = buildProjectSearchVariants("E. SRI 00. 6A");
  assert.ok(variants.includes("ESRI 006A"));
  assert.ok(variants.includes("ESRI-006A"));
  assert.ok(variants.includes("ESRI006A"));

  assert.ok(
    buildProjectSearchVariants("Do you have access to the second floor cleaning project?").includes(
      "second floor cleaning"
    )
  );
});

test("ranks an exact custom project ID above a partial display-name result", async () => {
  const client = mockClient((body, params) => {
    if (params?.schema === true) {
      return {
        properties: {
          records: {
            items: {
              properties: {
                Project: {
                  properties: {
                    CustomFields: { properties: { "Project ID": {} } },
                  },
                },
              },
            },
          },
        },
      };
    }

    const filter = body.Filters?.[0];
    if (filter?.Field === "Project/ProjectName" && filter.Value === "%ESRI 006A%") {
      return {
        records: [
          {
            Project: {
              ProjectName: "ESRI 006A - Archive",
              PortalId: "project-archive",
            },
          },
        ],
      };
    }
    if (filter?.Field === "Project/CustomFields/Project ID" && filter.Value === "%ESRI006A%") {
      return { records: [exactProject] };
    }
    return { records: [] };
  });

  const result = await searchProjects(client, "E. SRI 00. 6A");

  assert.deepEqual(result.searchTermsTried, ["E. SRI 00. 6A", "e sri 00 6a", "ESRI 006A", "ESRI-006A", "ESRI006A"]);
  assert.equal(result.normalizedSearchTerm, "ESRI006A");
  assert.equal(result.matches[0]?.portalId, "project-006a");
  assert.equal(result.matches[0]?.matchedBy, "Project/CustomFields/Project ID");
  assert.equal(result.matches[0]?.matchedSearchTerm, "ESRI006A");
  assert.equal(result.matches[0]?.matchConfidence, "exact");
});

test("searches descriptive project names and leaves no-match callers actionable", async () => {
  const client = mockClient((body, params) => {
    if (params?.schema === true) return { properties: {} };
    const filter = body.Filters?.[0];
    if (filter?.Field === "Project/ProjectName" && filter.Value === "%Second Floor Cleaning%") {
      return { records: [exactProject] };
    }
    return { records: [] };
  });

  const found = await searchProjects(client, "Second Floor Cleaning");
  assert.equal(found.matches[0]?.projectName, "Second Floor Cleaning");
  assert.equal(found.matches[0]?.matchConfidence, "exact");

  const notFound = await searchProjects(client, "Unknown nickname");
  assert.equal(notFound.matches.length, 0);
  assert.ok(notFound.searchTermsTried.includes("Unknown nickname"));
  assert.ok(notFound.suggestedFilters.length > 0);
});
