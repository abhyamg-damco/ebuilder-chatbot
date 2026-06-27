import { z } from "zod";
import type { EBuilderClient } from "../api/client.js";
import { toToolError, toToolResult } from "../api/client.js";
import { searchProjects } from "../api/project-search.js";
import { buildQueryParams, buildQueryPath } from "../api/resources.js";
import { TOOL_GUIDES } from "../prompts/domain-guides.js";
import type { ToolRegistrar } from "./types.js";

/** Find budget amount field paths from Budgets query schema. */
function findBudgetAmountFields(schema: unknown): string[] {
  const fields: string[] = [];
  const keywords =
    /original|budget|amount|total|presented|approved|baseline/i;

  function walk(obj: unknown, path: string): void {
    if (!obj || typeof obj !== "object") {
      return;
    }

    if (Array.isArray(obj)) {
      for (const item of obj) {
        walk(item, path);
      }
      return;
    }

    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const nextPath = path ? `${path}/${key}` : key;
      if (keywords.test(key) && nextPath.includes("/")) {
        fields.push(nextPath.replace(/^\//, ""));
      }
      walk(value, nextPath);
    }
  }

  walk(schema, "");
  return [...new Set(fields)].slice(0, 12);
}

function extractRecords(data: unknown): unknown[] {
  if (!data || typeof data !== "object") {
    return [];
  }
  const records = (data as { records?: unknown[] }).records;
  return Array.isArray(records) ? records : [];
}

/**
 * High-level orchestration tool: resolve project → discover budget schema → query budgets.
 * Use for "original budget", "total budget", and similar project budget questions.
 */
export function registerGetOriginalBudgetTool(
  server: ToolRegistrar,
  client: EBuilderClient
): void {
  server.registerTool(
    "get_original_budget",
    {
      description: TOOL_GUIDES.get_original_budget,
      inputSchema: {
        projectSearchTerm: z
          .string()
          .describe(
            "Project name, code, or ID as the user stated it (e.g. ESRI 005, Tower, SG3)"
          ),
      },
    },
    async (args) => {
      try {
        const projectSearchTerm = String(args.projectSearchTerm);
        const steps: string[] = [];

        steps.push(`searchProjects("${projectSearchTerm}")`);
        const projectResult = await searchProjects(client, projectSearchTerm, 5);

        if (projectResult.matches.length === 0) {
          return toToolResult({
            status: "incomplete",
            answer: null,
            projectSearchTerm,
            stepsCompleted: steps,
            strategiesAttempted: projectResult.strategiesAttempted,
            nextSteps: [
              "Call discover_query_schema with resource=Projects and inspect custom field names",
              `Call query_records on Projects with Filters: ${JSON.stringify(projectResult.suggestedFilters)}`,
              "If still no match, try query_records on Budgets filtering by project-related fields from schema",
            ],
            agentDirective:
              "DO NOT tell the user no project exists yet. Run the nextSteps tools first.",
          });
        }

        const project = projectResult.matches[0];
        steps.push("discover_query_schema(Budgets)");

        const budgetSchemaPath = buildQueryPath("Budgets");
        const schemaParams = buildQueryParams({
          schema: true,
          pageNumber: 0,
          pageSize: 0,
        });
        const budgetSchema = await client.post(
          budgetSchemaPath,
          {},
          schemaParams
        );

        const amountFields = findBudgetAmountFields(budgetSchema);
        const selectedFields = [
          "Project/ProjectName",
          "Project/PortalId",
          "Budget/BudgetId",
          "Budget/Description",
          ...amountFields,
        ];

        const filters = project.portalId
          ? [
              {
                Field: "Project/PortalId",
                Operation: "LIKE",
                Value: project.portalId,
              },
            ]
          : project.projectName
            ? [
                {
                  Field: "Project/ProjectName",
                  Operation: "LIKE",
                  Value: `%${project.projectName}%`,
                },
              ]
            : projectResult.suggestedFilters;

        steps.push("query_records(Budgets)");
        const budgetData = await client.post(
          budgetSchemaPath,
          { SelectedFields: selectedFields, Filters: filters },
          buildQueryParams({ schema: false, pageNumber: 0, pageSize: 50 })
        );

        const budgetRecords = extractRecords(budgetData);

        return toToolResult({
          status: budgetRecords.length > 0 ? "complete" : "partial",
          answer: {
            project: {
              name: project.projectName,
              portalId: project.portalId,
              matchedBy: project.matchedBy,
              customFields: project.customFields,
            },
            budgetRecords,
            amountFieldsUsed: amountFields,
          },
          projectSearchTerm,
          stepsCompleted: steps,
          strategiesAttempted: projectResult.strategiesAttempted,
          agentDirective:
            budgetRecords.length > 0
              ? "Summarize original/total budget amounts from budgetRecords for the user."
              : "Call discover_query_schema(Budgets) and retry query_records with fields from schema.",
        });
      } catch (error) {
        return toToolError(
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  );
}
