/** Per-tool description supplements appended to MCP tool definitions. */
export const TOOL_GUIDES = {
  discover_query_schema: `ALWAYS call this before the first query_records on a resource.
Returns available SelectedFields, filterable fields, and operations when schema=true.
Example: { "resource": "Budgets" } → inspect fields like Budget/OriginalBudget, Project/ProjectName.
For process workflows, pass processPrefix when known.`,

  discover_get_schema: `Use for GET-only resources: SubmittalItems, SubmittalPackages, Forecasts, CashFlows.
Call before get_records or get_record_detail on a new resource.
Pass recordId when discovering detail/sub-resource schemas.`,

  query_records: `Executes POST /api/v2/{Resource}/Query. Requires prior discover_query_schema.
Body must include SelectedFields and optional Filters from schema. Supports pagination via pageNumber/pageSize.
Covers: budgets, changes, commitments, invoices, companies, documents, funding.`,

  get_records: `Executes GET /api/v2/{Resource} list endpoints. Use dateModified, limit, offset for paging.
Best for Submittals, Forecasts, CashFlows where no Query endpoint exists.`,

  get_record_detail: `GET /api/v2/{Resource}/{id} plus optional subResource: items, changes, customfields, contacts, reviewers.
Use after resolving record IDs from query results.`,

  resolve_project: `Fuzzy-match project by name or code (e.g. Tower, SG3, T1). Returns matches with IDs for Filters.
Call before project-scoped budget/commitment/invoice queries.`,

  resolve_company: `Fuzzy-match vendor/company by name (e.g. KOHN, FORTUNE, Moss). Returns IDs for Filters.
Vendors are stored as Companies in e-Builder.`,

  query_processes: `Query approval workflows and non-cost processes (bids, RFP, invoice approval queues).
Resources: BudgetChangeProcesses, CommitmentChangeProcesses, CommitmentProcesses,
CommitmentInvoiceProcesses, GeneralInvoiceProcesses, NonCostProcesses.
Use processPrefix from schema discovery. For approval queues, filter by assignee fields from schema.`,

  aggregate_records: `Server-side aggregation on records from a prior query. Use for top-N, sums, counts, group-by.
Pass the records array (or full API response with records key) plus operations spec.
Avoids re-fetching when answering "which project had the most changes" type questions.`,

  get_original_budget: `PREFERRED for "original budget", "total budget", "presented budget" questions.
Orchestrates: multi-strategy project search (name + custom fields like Project ID) → Budgets schema discovery → budget query.
Pass projectSearchTerm exactly as the user wrote it (e.g. "ESRI 005").
If status is incomplete/partial, follow nextSteps and agentDirective — do NOT tell user data is missing without trying them.`,
} as const;
