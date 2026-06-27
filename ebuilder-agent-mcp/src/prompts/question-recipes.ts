/** Maps natural-language question patterns to recommended tool sequences. */
export const QUESTION_RECIPES = `
| Question pattern | Tool sequence |
|------------------|---------------|
| Original budget for {project} | **get_original_budget** OR resolve_project → discover_query_schema(Budgets) → query_records |
| Budget changes for {project} | resolve_project → discover_query_schema(BudgetChanges) → query_records |
| Most budget changes / max change by project | query_records(BudgetChanges) → aggregate_records(groupBy=project, count/sum) |
| Budget changes list + count | query_records(BudgetChanges) with project filter → aggregate_records(count) |
| Total budget for {project} | resolve_project → discover_query_schema(Budgets) → query_records(sum budget fields) |
| Most-changed line item / max line change | query_records(BudgetChanges) → aggregate_records(groupBy=line item) |
| FF&E approved budget | discover_query_schema(Budgets) → query_records filter category/line item |
| Top over/under budget areas | discover_query_schema(Budgets) → query_records → aggregate_records(sort by variance) |
| Original/current contract for {project} | resolve_project → discover_query_schema(Commitments) → query_records |
| Commitment changes for {project} | resolve_project → discover_query_schema(CommitmentChanges) → query_records |
| CO impacting {project} or {vendor} | discover_query_schema(CommitmentChanges) → query_records with filters |
| Soft cost vendors | discover_query_schema(Companies) + discover_query_schema(Commitments) → query both |
| Vendor change order stats | query_records(CommitmentChanges) → aggregate_records(groupBy=company) |
| Contingency used | discover_query_schema(ProjectFundingSources) → query_records |
| Payments to {vendor} | resolve_company → discover_query_schema(CommitmentInvoices) → query_records |
| Bids for {RFP} | discover_query_schema(NonCostProcesses) → query_processes filter subject |
| Invoices for {month}/{project} | discover_query_schema(CommitmentInvoices or GeneralInvoices) → query_records |
| Spend by month graph | discover_get_schema(CashFlows) or query_records(invoices) → aggregate_records by month |
| Invoice image for {vendor} | query_records(CommitmentInvoices) → discover_query_schema(Documents) → query_records |
| Pending invoice budget impact | discover_query_schema(CommitmentInvoiceProcesses) → query_processes |
| Approval queue for {user} | discover_query_schema(CommitmentInvoiceProcesses) → query_processes filter assignee |
| Retainage balance | discover_query_schema(CommitmentInvoices) find retainage fields → query_records |
| Changes under commitment {number} | discover_query_schema(CommitmentChanges) → query_records filter commitment |
| Contract summary for {vendor} | resolve_company → query_records(Commitments) → get_record_detail |
| Trending/presented budget | discover_get_schema(Forecasts) → get_records OR discover_query_schema(Budgets) |
| Approved submittals | discover_get_schema(SubmittalItems) → get_records with status filter |
| Commitments/budgets by GL code | discover_query_schema → query_records filter GL/account code field from schema |
| Predict finish within budget | query_records(Budgets) + get_records(Forecasts) + query_records(invoices) → reason |
`;
