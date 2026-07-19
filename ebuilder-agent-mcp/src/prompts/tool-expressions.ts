/**
 * Example tool-call payloads and Unity Construct API paths derived from
 * postman/Unity Construct APIs.postman_collection.json.
 * Used by MCP registerPrompt handlers to teach the agent correct expressions.
 */

export type ToolExpression = {
  /** Unity Construct HTTP endpoint this tool wraps */
  apiPath: string;
  /** Example MCP tool arguments (JSON string for prompt text) */
  exampleArgs: Record<string, unknown>;
  /** Optional query-string params shown in Postman */
  queryParams?: Record<string, string>;
};

/** Postman-backed examples keyed by MCP tool name */
export const TOOL_EXPRESSIONS = {
  discover_query_schema: {
    apiPath: "POST /api/v2/{Resource}/Query?schema=true&pageNumber=0&pageSize=0",
    queryParams: { schema: "true", pageNumber: "0", pageSize: "0" },
    exampleArgs: { resource: "Budgets" },
  },

  discover_get_schema: {
    apiPath: "GET /api/v2/{Resource}?schema=true",
    queryParams: { schema: "true" },
    exampleArgs: { resource: "CashFlows" },
  },

  query_records: {
    apiPath: "POST /api/v2/Budgets/Query?schema=false&pageNumber=0&pageSize=100",
    queryParams: { schema: "false", pageNumber: "0", pageSize: "100" },
    exampleArgs: {
      resource: "Budgets",
      body: {
        SelectedFields: [
          "Project/ProjectName",
          "Budget/BudgetId",
          "LineItems/BudgetLineItem/BudgetAmount",
        ],
        Filters: [
          {
            Field: "Project/ProjectName",
            Operation: "LIKE",
            Value: "%Test%",
          },
        ],
        AdvancedScript:
          "orderby:[Budget/Description],[LineItems/BudgetLineItem/BudgetId]",
      },
      pageNumber: 0,
      pageSize: 100,
    },
  },

  get_records: {
    apiPath: "GET /api/v2/CashFlows?limit=100&offset=0&schema=false",
    queryParams: { limit: "100", offset: "0", schema: "false" },
    exampleArgs: {
      resource: "CashFlows",
      limit: 100,
      offset: 0,
    },
  },

  get_record_detail: {
    apiPath: "GET /api/v2/CommitmentInvoices/{id}/items?schema=false",
    queryParams: { schema: "false" },
    exampleArgs: {
      resource: "CommitmentInvoices",
      recordId: "{CommitmentInvoiceId}",
      subResource: "items",
    },
  },

  resolve_project: {
    apiPath:
      "POST /api/v2/Projects/Query (multi-strategy: ProjectName, CustomFields/Project ID)",
    exampleArgs: { searchTerm: "ESRI 005", maxResults: 10 },
  },

  resolve_company: {
    apiPath: "POST /api/v2/Companies/query?schema=false&pageNumber=0&pageSize=10",
    queryParams: { schema: "false", pageNumber: "0", pageSize: "10" },
    exampleArgs: {
      searchTerm: "KOHN",
      maxResults: 10,
    },
  },

  query_processes: {
    apiPath:
      "POST /api/v2/CommitmentInvoiceProcesses/Query?schema=false&pageNumber=0&pageSize=100",
    queryParams: { schema: "false", pageNumber: "0", pageSize: "100" },
    exampleArgs: {
      resource: "CommitmentInvoiceProcesses",
      processPrefix: "{from schema discovery}",
      body: {
        SelectedFields: [
          "ProcessInstance/Subject",
          "ProcessInstance/InstanceId",
          "Process/Prefix",
          "CommitmentInvoice/InvoiceNumber",
        ],
        Filters: [
          {
            Field: "ProcessInstance/Subject",
            Operation: "LIKE",
            Value: "%Test%",
          },
        ],
      },
      pageNumber: 0,
      pageSize: 100,
    },
  },

  aggregate_records: {
    apiPath: "Local — no HTTP call; operates on prior query_records response",
    exampleArgs: {
      data: "{records array from query_records}",
      spec: {
        groupBy: "Project/ProjectName",
        sumField: "LineItems/BudgetChangeItem/Amount",
        count: true,
        topN: 5,
        sortBy: { field: "sum", direction: "desc" },
      },
    },
  },

  get_original_budget: {
    apiPath:
      "Orchestrates: Projects search → POST /api/v2/Budgets/Query (schema + data)",
    exampleArgs: { projectSearchTerm: "ESRI 005" },
  },

  assemble_invoice_evidence_pack: {
    apiPath:
      "Orchestrates: CommitmentInvoices Query + GET detail/items + related Commitments/Changes",
    exampleArgs: {
      invoiceNumber: "006",
      projectSearchTerm: "Tower",
    },
  },

  evaluate_invoice_checks: {
    apiPath: "Local — deterministic checks on EvidencePack from assemble tool",
    exampleArgs: {
      pack: "{EvidencePack from assemble_invoice_evidence_pack}",
      tolerances: { overBillPct: 0.02, overBillMinUsd: 500 },
      enabledChecks: { OVER_BILLING: true, RETAINAGE: true, MATH: true },
    },
  },

  search_documents: {
    apiPath: "POST /api/v2/Documents/Query?schema=false&pageNumber=0&pageSize=20",
    queryParams: { schema: "false", pageNumber: "0", pageSize: "20" },
    exampleArgs: {
      projectSearchTerm: "Tower",
      fileNamePattern: "%invoice%",
      documentType: "PDF",
      limit: 20,
    },
  },
} as const satisfies Record<string, ToolExpression>;

/** Resource-specific query_records examples from Postman */
export const QUERY_RECORDS_BY_RESOURCE: Record<string, Record<string, unknown>> =
  {
    BudgetChanges: {
      resource: "BudgetChanges",
      body: {
        SelectedFields: [
          "BudgetChange/ChangeNumber",
          "BudgetChange/BudgetChangeId",
          "LineItems/BudgetChangeItem/Amount",
        ],
        Filters: [
          { Field: "BudgetChange/ChangeNumber", Operation: "LIKE", Value: "T" },
        ],
      },
    },
    Commitments: {
      resource: "Commitments",
      body: {
        SelectedFields: [
          "Commitment/CommitmentNumber",
          "Commitment/CommitmentId",
          "LineItems/CommitmentItem/ItemNumber",
        ],
        Filters: [
          {
            Field: "Commitment/CommitmentNumber",
            Operation: "LIKE",
            Value: "%Test%",
          },
        ],
      },
    },
    CommitmentChanges: {
      resource: "CommitmentChanges",
      body: {
        SelectedFields: [
          "CommitmentChange/ChangeNumber",
          "CommitmentChange/CommitmentChangeId",
          "LineItems/CommitmentChangeItem/Amount",
        ],
        Filters: [
          {
            Field: "CommitmentChange/ChangeNumber",
            Operation: "LIKE",
            Value: "T",
          },
        ],
      },
    },
    CommitmentInvoices: {
      resource: "CommitmentInvoices",
      body: {
        SelectedFields: [
          "CommitmentInvoice/InvoiceNumber",
          "CommitmentInvoice/CommitmentInvoiceId",
          "LineItems/CommitmentInvoiceItem/ActualsApproved",
        ],
        Filters: [
          {
            Field: "CommitmentInvoice/InvoiceNumber",
            Operation: "LIKE",
            Value: "%Test%",
          },
        ],
      },
    },
    GeneralInvoices: {
      resource: "GeneralInvoices",
      body: {
        SelectedFields: [
          "Invoice/InvoiceNumber",
          "Invoice/InvoiceId",
          "LineItems/InvoiceItem/ItemNumber",
        ],
        Filters: [
          { Field: "Invoice/InvoiceNumber", Operation: "LIKE", Value: "%Test%" },
        ],
      },
    },
    Companies: {
      resource: "Companies",
      body: {
        SelectedFields: ["Company/CompanyName", "Company/CompanyId"],
        Filters: [
          { Field: "Company/CompanyName", Operation: "LIKE", Value: "%Test%" },
        ],
      },
    },
    Documents: {
      resource: "Documents",
      body: {
        SelectedFields: [
          "Document/FileName",
          "Document/DocumentType",
          "Document/FileId",
          "Project/ProjectName",
        ],
        Filters: [
          { Field: "Project/ProjectName", Operation: "LIKE", Value: "%test%" },
        ],
      },
    },
    ProjectFundingSources: {
      resource: "ProjectFundingSources",
      body: {
        SelectedFields: [
          "FundingSource/Name",
          "FundingSource/FundingSourceId",
          "LineItems/FundingSourceAdjustments/Description",
        ],
        Filters: [
          { Field: "FundingSource/Name", Operation: "LIKE", Value: "%Test%" },
        ],
      },
    },
  };
