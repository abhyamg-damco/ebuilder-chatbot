import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TOOL_GUIDES } from "./domain-guides.js";
import {
  QUERY_RECORDS_BY_RESOURCE,
  TOOL_EXPRESSIONS,
  type ToolExpression,
} from "./tool-expressions.js";

/** Format query params for prompt display */
function formatQueryParams(params?: Record<string, string>): string {
  if (!params || Object.keys(params).length === 0) {
    return "";
  }
  const qs = new URLSearchParams(params).toString();
  return qs ? `?${qs}` : "";
}

/** Build prompt message text from guide, API path, and example args */
function buildPromptBody(
  guide: string,
  expression: ToolExpression,
  exampleOverride?: Record<string, unknown>
): string {
  const example = exampleOverride ?? expression.exampleArgs;
  const querySuffix = formatQueryParams(expression.queryParams);

  return [
    guide,
    "",
    "## Unity Construct API (Postman reference)",
    `${expression.apiPath}${querySuffix}`,
    "",
    "## Example MCP tool call",
    "```json",
    JSON.stringify(example, null, 2),
    "```",
    "",
    "Call this tool with the arguments above (adjust filters/fields from discover_query_schema).",
  ].join("\n");
}

type PromptMessage = {
  role: "user";
  content: { type: "text"; text: string };
};

function userMessage(text: string): { messages: PromptMessage[] } {
  return {
    messages: [{ role: "user", content: { type: "text", text } }],
  };
}

/** Register MCP prompts for every tool — exposes Postman-backed call expressions. */
export function registerToolPrompts(server: McpServer): void {
  server.registerPrompt(
    "discover_query_schema",
    {
      description: TOOL_GUIDES.discover_query_schema,
      argsSchema: {
        resource: z
          .string()
          .optional()
          .describe("Query resource, e.g. Budgets, CommitmentInvoices"),
      },
    },
    (args) => {
      const resource = args.resource ?? "Budgets";
      const expr = TOOL_EXPRESSIONS.discover_query_schema;
      return userMessage(
        buildPromptBody(TOOL_GUIDES.discover_query_schema, expr, {
          resource,
        })
      );
    }
  );

  server.registerPrompt(
    "discover_get_schema",
    {
      description: TOOL_GUIDES.discover_get_schema,
      argsSchema: {
        resource: z
          .string()
          .optional()
          .describe("GET resource, e.g. CashFlows, SubmittalItems"),
      },
    },
    (args) => {
      const resource = args.resource ?? "CashFlows";
      return userMessage(
        buildPromptBody(TOOL_GUIDES.discover_get_schema, {
          ...TOOL_EXPRESSIONS.discover_get_schema,
          apiPath: `GET /api/v2/${resource}?schema=true`,
        }, { resource })
      );
    }
  );

  server.registerPrompt(
    "query_records",
    {
      description: TOOL_GUIDES.query_records,
      argsSchema: {
        resource: z
          .string()
          .optional()
          .describe(
            "Query resource — Budgets, CommitmentChanges, Documents, etc."
          ),
      },
    },
    (args) => {
      const resource = args.resource ?? "Budgets";
      const resourceExample = QUERY_RECORDS_BY_RESOURCE[resource];
      const exampleArgs =
        resourceExample ??
        ({
          resource,
          body: {
            SelectedFields: ["Project/ProjectName"],
            Filters: [
              { Field: "Project/ProjectName", Operation: "LIKE", Value: "%" },
            ],
          },
          pageNumber: 0,
          pageSize: 100,
        } as Record<string, unknown>);

      const apiPath = `POST /api/v2/${resource}/Query?schema=false&pageNumber=0&pageSize=100`;

      return userMessage(
        buildPromptBody(TOOL_GUIDES.query_records, {
          ...TOOL_EXPRESSIONS.query_records,
          apiPath,
        }, exampleArgs)
      );
    }
  );

  server.registerPrompt(
    "get_records",
    {
      description: TOOL_GUIDES.get_records,
      argsSchema: {
        resource: z.string().optional().describe("GET list resource"),
      },
    },
    (args) => {
      const resource = args.resource ?? "CashFlows";
      return userMessage(
        buildPromptBody(TOOL_GUIDES.get_records, {
          ...TOOL_EXPRESSIONS.get_records,
          apiPath: `GET /api/v2/${resource}?limit=100&offset=0&schema=false`,
        }, { resource, limit: 100, offset: 0 })
      );
    }
  );

  server.registerPrompt(
    "get_record_detail",
    {
      description: TOOL_GUIDES.get_record_detail,
      argsSchema: {
        resource: z.string().optional(),
        subResource: z
          .enum(["items", "changes", "customfields", "contacts", "reviewers"])
          .optional(),
      },
    },
    (args) => {
      const resource = args.resource ?? "CommitmentInvoices";
      const subResource = args.subResource ?? "items";
      const pathSuffix = subResource ? `/{id}/${subResource}` : "/{id}";
      return userMessage(
        buildPromptBody(TOOL_GUIDES.get_record_detail, {
          ...TOOL_EXPRESSIONS.get_record_detail,
          apiPath: `GET /api/v2/${resource}${pathSuffix}?schema=false`,
        }, {
          resource,
          recordId: "{recordId}",
          subResource,
        })
      );
    }
  );

  server.registerPrompt(
    "resolve_project",
    { description: TOOL_GUIDES.resolve_project },
    () =>
      userMessage(
        buildPromptBody(
          TOOL_GUIDES.resolve_project,
          TOOL_EXPRESSIONS.resolve_project
        )
      )
  );

  server.registerPrompt(
    "resolve_company",
    { description: TOOL_GUIDES.resolve_company },
    () =>
      userMessage(
        buildPromptBody(
          TOOL_GUIDES.resolve_company,
          TOOL_EXPRESSIONS.resolve_company
        )
      )
  );

  server.registerPrompt(
    "query_processes",
    {
      description: TOOL_GUIDES.query_processes,
      argsSchema: {
        resource: z
          .string()
          .optional()
          .describe(
            "Process resource, e.g. CommitmentInvoiceProcesses, NonCostProcesses"
          ),
      },
    },
    (args) => {
      const resource = args.resource ?? "CommitmentInvoiceProcesses";
      return userMessage(
        buildPromptBody(TOOL_GUIDES.query_processes, {
          ...TOOL_EXPRESSIONS.query_processes,
          apiPath: `POST /api/v2/${resource}/Query?schema=false&pageNumber=0&pageSize=100`,
        }, {
          ...TOOL_EXPRESSIONS.query_processes.exampleArgs,
          resource,
        })
      );
    }
  );

  server.registerPrompt(
    "aggregate_records",
    { description: TOOL_GUIDES.aggregate_records },
    () =>
      userMessage(
        buildPromptBody(
          TOOL_GUIDES.aggregate_records,
          TOOL_EXPRESSIONS.aggregate_records
        )
      )
  );

  server.registerPrompt(
    "get_original_budget",
    {
      description: TOOL_GUIDES.get_original_budget,
      argsSchema: {
        projectSearchTerm: z
          .string()
          .optional()
          .describe("Project name/code as user stated it"),
      },
    },
    (args) => {
      const projectSearchTerm = args.projectSearchTerm ?? "ESRI 005";
      return userMessage(
        buildPromptBody(TOOL_GUIDES.get_original_budget, {
          ...TOOL_EXPRESSIONS.get_original_budget,
        }, { projectSearchTerm })
      );
    }
  );

  server.registerPrompt(
    "assemble_invoice_evidence_pack",
    {
      description: TOOL_GUIDES.assemble_invoice_evidence_pack,
      argsSchema: {
        invoiceNumber: z.string().optional(),
        projectSearchTerm: z.string().optional(),
      },
    },
    (args) =>
      userMessage(
        buildPromptBody(
          TOOL_GUIDES.assemble_invoice_evidence_pack,
          TOOL_EXPRESSIONS.assemble_invoice_evidence_pack,
          {
            invoiceNumber: args.invoiceNumber ?? "006",
            projectSearchTerm: args.projectSearchTerm ?? "Tower",
          }
        )
      )
  );

  server.registerPrompt(
    "evaluate_invoice_checks",
    { description: TOOL_GUIDES.evaluate_invoice_checks },
    () =>
      userMessage(
        buildPromptBody(
          TOOL_GUIDES.evaluate_invoice_checks,
          TOOL_EXPRESSIONS.evaluate_invoice_checks
        )
      )
  );

  server.registerPrompt(
    "search_documents",
    {
      description: TOOL_GUIDES.search_documents,
      argsSchema: {
        projectSearchTerm: z.string().optional(),
        fileNamePattern: z.string().optional(),
        invoiceNumber: z.string().optional(),
      },
    },
    (args) =>
      userMessage(
        buildPromptBody(TOOL_GUIDES.search_documents, {
          ...TOOL_EXPRESSIONS.search_documents,
        }, {
          projectSearchTerm: args.projectSearchTerm ?? "Tower",
          fileNamePattern: args.fileNamePattern ?? "%invoice%",
          invoiceNumber: args.invoiceNumber ?? "006",
          limit: 20,
        })
      )
  );

  server.registerPrompt(
    "get_invoice_document",
    {
      description: TOOL_GUIDES.get_invoice_document,
      argsSchema: {
        invoiceNumber: z.string().optional(),
        projectSearchTerm: z.string().optional(),
      },
    },
    (args) =>
      userMessage(
        buildPromptBody(
          TOOL_GUIDES.get_invoice_document,
          TOOL_EXPRESSIONS.get_invoice_document,
          {
            invoiceNumber: args.invoiceNumber ?? "006",
            projectSearchTerm: args.projectSearchTerm ?? "Tower",
            limit: 10,
          }
        )
      )
  );
}
