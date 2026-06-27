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
            "Project name, code, or custom ID (e.g. Tower, SG3, ESRI 005)"
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
                  "Call discover_query_schema(Budgets) to find budget amount field names",
                  `Call query_records(Budgets) with Filters: ${JSON.stringify(result.suggestedFilters)}`,
                  "For original budget questions, prefer get_original_budget with the same search term",
                ]
              : [
                  "Call discover_query_schema(Projects) — inspect CustomFields property names",
                  `Call query_records(Projects) with Filters: ${JSON.stringify(result.suggestedFilters)}`,
                  "Try get_original_budget — it orchestrates schema + query automatically",
                ],
          agentDirective:
            "DO NOT stop here. Continue with nextSteps until you can answer the user's question.",
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
