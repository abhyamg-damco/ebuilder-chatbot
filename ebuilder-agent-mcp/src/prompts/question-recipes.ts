/** Maps natural-language question patterns to recommended tool sequences. */
export const QUESTION_RECIPES = `
| Question pattern | Tool sequence | Output artifact |
|------------------|---------------|-----------------|
| Original budget for {project} | **get_original_budget** OR resolve_project → discover_query_schema(Budgets) → query_records | chat text |
| Budget changes for {project} | resolve_project → discover_query_schema(BudgetChanges) → query_records | sheet |
| Most budget changes / max change by project | query_records(BudgetChanges) → aggregate_records(groupBy=project, count/sum) | dashboard |
| Budget changes list + count | query_records(BudgetChanges) with project filter → aggregate_records(count) | sheet |
| Total budget for {project} | resolve_project → discover_query_schema(Budgets) → query_records(sum budget fields) | dashboard |
| Most-changed line item / max line change | query_records(BudgetChanges) → aggregate_records(groupBy=line item) | sheet |
| FF&E approved budget | discover_query_schema(Budgets) → query_records filter category/line item | sheet |
| Top over/under budget areas | discover_query_schema(Budgets) → query_records → aggregate_records(sort by variance) | sheet |
| Original/current contract for {project} | resolve_project → discover_query_schema(Commitments) → query_records | dashboard |
| Commitment changes for {project} | resolve_project → discover_query_schema(CommitmentChanges) → query_records | sheet |
| CO impacting {project} or {vendor} | discover_query_schema(CommitmentChanges) → query_records with filters | sheet |
| Soft cost vendors | discover_query_schema(Companies) + discover_query_schema(Commitments) → query both | sheet |
| Vendor change order stats | query_records(CommitmentChanges) → aggregate_records(groupBy=company) | dashboard |
| Contingency used | discover_query_schema(ProjectFundingSources) → query_records | dashboard |
| Payments to {vendor} | resolve_company → discover_query_schema(CommitmentInvoices) → query_records | sheet |
| Bids for {RFP} | discover_query_schema(NonCostProcesses) → query_processes filter subject | sheet (leveling table) |
| Invoices for {month}/{project} | discover_query_schema(CommitmentInvoices or GeneralInvoices) → query_records | dashboard |
| Spend by month graph | query_records(invoices/cashflows) → aggregate_records(groupByMonth, scaleDivisor=1e6) | **chart** |
| Invoice image for {vendor} | search_documents(fileNamePattern) OR query_records → search_documents | **file-preview** |
| Pending invoice budget impact | discover_query_schema(CommitmentInvoiceProcesses) → query_processes | dashboard |
| Approval queue for {user} | discover_query_schema(CommitmentInvoiceProcesses) → query_processes filter assignee | sheet |
| Retainage balance | discover_query_schema(CommitmentInvoices) → query_records → aggregate | **dashboard** |
| Changes under commitment {number} | discover_query_schema(CommitmentChanges) → query_records filter commitment | sheet |
| Contract summary for {vendor} | resolve_company → query_records(Commitments) → get_record_detail | dashboard |
| Trending/presented budget | discover_get_schema(Forecasts) → get_records OR discover_query_schema(Budgets) | chart |
| Approved submittals | discover_get_schema(SubmittalItems) → get_records with status filter | sheet |
| Commitments/budgets by GL code | discover_query_schema → query_records filter GL/account code field from schema | sheet |
| Predict finish within budget | query_records(Budgets) + get_records(Forecasts) + query_records(invoices) → reason | chat text |
| What are my top 3 vendors | query_records(Commitments) → aggregate_records(topN=3) | **dashboard** |
| Review invoice #{n} on {project} | assemble_invoice_evidence_pack → evaluate_invoice_checks → createDocument(advisory-brief) | advisory-brief |
| Invoice on my desk / help me review | assemble_invoice_evidence_pack → evaluate_invoice_checks | advisory-brief |
| Retainage / over-billing on draw | assemble_invoice_evidence_pack → evaluate_invoice_checks | advisory-brief |
`;
