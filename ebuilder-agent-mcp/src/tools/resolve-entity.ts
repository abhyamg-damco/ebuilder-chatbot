import { z } from "zod";
import type { EBuilderClient } from "../api/client.js";
import { toToolError, toToolResult } from "../api/client.js";
import { searchProjects } from "../api/project-search.js";
import { buildQueryParams, buildQueryPath } from "../api/resources.js";
import { TOOL_GUIDES } from "../prompts/domain-guides.js";
import type { ToolRegistrar } from "./types.js";

/** Build a LIKE filter pattern for fuzzy name matching. */
function likePattern(term: string): string {
  const trimmed = term.trim();
  return trimmed.includes("%") ? trimmed : `%${trimmed}%`;
}

function extractRecords(data: unknown): unknown[] {
  if (!data || typeof data !== "object") {
    return [];
  }
  const recordList = (data as { records?: unknown[] }).records;
  return Array.isArray(recordList) ? recordList : [];
}

export function registerResolveProjectTool(
  server: ToolRegistrar,
  client: EBuilderClient
): void {
  server.registerTool(
    "resolve_project",
    {
      description: TOOL_GUIDES.resolve_project,
      inputSchema: {
        searchTerm: z
          .string()
          .describe(
            "Raw project name, number, code, nickname, or voice transcript as heard (e.g. Tower, SG3, ESRI-006A, E. SRI 00. 6A)"
          ),
        maxResults: z.number().int().min(1).max(50).optional().default(10),
      },
    },
    async (args) => {
      try {
        const searchTerm = String(args.searchTerm);
        const maxResults = (args.maxResults as number | undefined) ?? 10;

        const result = await searchProjects(client, searchTerm, maxResults);

        const status = result.matches.length > 0 ? "found" : "not_found";

        return toToolResult({
          status,
          searchTerm: result.searchTerm,
          matches: result.matches,
          strategiesAttempted: result.strategiesAttempted,
          suggestedFilters: result.suggestedFilters,
          nextSteps:
            result.matches.length > 0
              ? [
                  "The project is verified. For access questions, answer yes and name the returned project before continuing with any requested data lookup.",
                  "Call discover_query_schema(Budgets) to find budget amount field names",
                  `Call query_records(Budgets) with Filters: ${JSON.stringify(result.suggestedFilters)}`,
                  "For original budget questions, prefer get_original_budget with the same search term",
                ]
              : [
                  "Call discover_query_schema(Projects) — inspect CustomFields property names",
                  `Call query_records(Projects) with Filters: ${JSON.stringify(result.suggestedFilters)}`,
                  "Try get_original_budget — it orchestrates schema + query automatically",
                  "If those searches cannot verify a project, ask the user for the official project name or project number. Do not guess that a nickname maps to a project code.",
                ],
          agentDirective:
            result.matches.length > 0
              ? "This is a verified project result. Use its returned project name and ID when answering access questions. Continue with nextSteps for requested data."
              : "DO NOT stop after a transcript, punctuation, spacing, or spelling variant fails. Continue with nextSteps; only then ask for the official project name or number.",
        });
      } catch (error) {
        return toToolError(
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  );
}

export function registerResolveCompanyTool(
  server: ToolRegistrar,
  client: EBuilderClient
): void {
  server.registerTool(
    "resolve_company",
    {
      description: TOOL_GUIDES.resolve_company,
      inputSchema: {
        searchTerm: z
          .string()
          .describe("Vendor/company name fragment, e.g. KOHN, FORTUNE"),
        maxResults: z.number().int().min(1).max(50).optional().default(10),
      },
    },
    async (args) => {
      try {
        const searchTerm = String(args.searchTerm);
        const maxResults = (args.maxResults as number | undefined) ?? 10;
        const path = buildQueryPath("Companies");
        const params = buildQueryParams({
          schema: false,
          pageNumber: 0,
          pageSize: maxResults,
          processPrefix: "",
        });

        const body = {
          SelectedFields: ["Company/CompanyId", "Company/CompanyName"],
          Filters: [
            {
              Field: "Company/CompanyName",
              Operation: "LIKE",
              Value: likePattern(searchTerm),
            },
          ],
        };

        const data = await client.post(path, body, params);
        const matches = extractRecords(data);

        return toToolResult({
          status: matches.length > 0 ? "found" : "not_found",
          searchTerm,
          matches,
          suggestedFilters: [
            {
              Field: "Company/CompanyName",
              Operation: "LIKE",
              Value: likePattern(searchTerm),
            },
          ],
          nextSteps: [
            "Call discover_query_schema on Commitments or CommitmentInvoices",
            "Call query_records with company filters from suggestedFilters",
          ],
          agentDirective:
            "DO NOT stop here if the user asked about payments, contracts, or invoices.",
        });
      } catch (error) {
        return toToolError(
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  );
}
