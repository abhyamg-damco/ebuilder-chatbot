import { z } from "zod";

/** Resources exposed via POST .../Query endpoints. */
export const queryResourceSchema = z.enum([
  "Budgets",
  "BudgetChanges",
  "Commitments",
  "CommitmentChanges",
  "CommitmentInvoices",
  "GeneralInvoices",
  "CommitmentInvoiceProcesses",
  "GeneralInvoiceProcesses",
  "Companies",
  "Projects",
  "Documents",
  "NonCostProcesses",
  "ProjectFundingSources",
  "BudgetChangeProcesses",
  "CommitmentChangeProcesses",
  "CommitmentProcesses",
  "Forecasts",
  "CashFlows",
]);

export type QueryResource = z.infer<typeof queryResourceSchema>;

/** Resources for GET list/detail endpoints. */
export const getResourceSchema = z.enum([
  "Budgets",
  "BudgetChanges",
  "Commitments",
  "CommitmentChanges",
  "CommitmentInvoices",
  "GeneralInvoices",
  "Companies",
  "Projects",
  "Documents",
  "Forecasts",
  "ForecastItems",
  "CashFlows",
  "SubmittalItems",
  "SubmittalPackages",
  "ProcessInstances",
  "MasterCommitments",
  "MasterCommitmentChanges",
  "MasterInvoices",
  "AccountFundingAdjustments",
  "ProjectFundingSources",
]);

export type GetResource = z.infer<typeof getResourceSchema>;

/** Workflow process resources for query_processes tool. */
export const processResourceSchema = z.enum([
  "BudgetChangeProcesses",
  "CommitmentChangeProcesses",
  "CommitmentProcesses",
  "CommitmentInvoiceProcesses",
  "GeneralInvoiceProcesses",
  "NonCostProcesses",
]);

export type ProcessResource = z.infer<typeof processResourceSchema>;

export type SubResource =
  | "items"
  | "changes"
  | "customfields"
  | "contacts"
  | "reviewers";

export interface QueryPathOptions {
  processPrefix?: string;
  gridName?: string;
  useDynamicGrid?: boolean;
}

export interface PaginationQuery {
  schema?: boolean;
  pageNumber?: number;
  pageSize?: number;
  processPrefix?: string;
  gridName?: string;
}

const COMPANIES_QUERY_PATH = "/api/v2/Companies/query";

/** Build the POST Query path for a resource. */
export function buildQueryPath(
  resource: QueryResource | ProcessResource,
  options: QueryPathOptions = {}
): string {
  if (resource === "Companies") {
    return COMPANIES_QUERY_PATH;
  }

  if (options.useDynamicGrid && options.gridName) {
    return `/api/v2/${resource}/DynamicGrid/Query`;
  }

  return `/api/v2/${resource}/Query`;
}

/** Build GET path for list or detail endpoints. */
export function buildGetPath(
  resource: GetResource,
  id?: string,
  subResource?: SubResource
): string {
  const base = `/api/v2/${resource}`;
  if (!id) {
    return base;
  }
  if (subResource) {
    return `${base}/${id}/${subResource}`;
  }
  return `${base}/${id}`;
}

/** Serialize query-string params for Query endpoints. */
export function buildQueryParams(params: PaginationQuery): Record<string, string> {
  const result: Record<string, string> = {};

  if (params.schema !== undefined) {
    result.schema = String(params.schema);
  }
  if (params.pageNumber !== undefined) {
    result.pageNumber = String(params.pageNumber);
  }
  if (params.pageSize !== undefined) {
    result.pageSize = String(params.pageSize);
  }
  if (params.processPrefix !== undefined) {
    result.processPrefix = params.processPrefix;
  }
  if (params.gridName !== undefined) {
    result.gridName = params.gridName;
  }

  return result;
}

/** Standard e-Builder Query request body shape. */
export interface QueryRequestBody {
  SelectedFields?: string[];
  Filters?: Array<{
    Field: string;
    Operation: string;
    Value: string | number | boolean;
  }>;
  AdvancedScript?: string;
}
