import type { EBuilderClient } from "../api/client.js";
import { searchProjects } from "../api/project-search.js";
import {
  buildGetPath,
  buildQueryParams,
  buildQueryPath,
} from "../api/resources.js";
import type { EvidencePack } from "../checks/types.js";
import {
  mapChangeOrderStatus,
  normalizeCommitment,
  normalizeInvoiceHeader,
  normalizeInvoiceLines,
  normalizePriorInvoice,
  toNumber,
} from "../checks/normalize.js";

type JsonRecord = Record<string, unknown>;

function extractRecords(data: unknown): JsonRecord[] {
  if (!data || typeof data !== "object") {
    return [];
  }
  const records = (data as { records?: unknown[] }).records;
  if (!Array.isArray(records)) {
    return [];
  }
  return records.filter(
    (item): item is JsonRecord => typeof item === "object" && item !== null
  );
}

function extractDetails(data: unknown): JsonRecord[] {
  if (!data || typeof data !== "object") {
    return [];
  }
  const details = (data as JsonRecord).details;
  if (!Array.isArray(details)) {
    return [];
  }
  return details.filter(
    (item): item is JsonRecord => typeof item === "object" && item !== null
  );
}

async function queryCommitmentInvoices(
  client: EBuilderClient,
  filters: Array<{ Field: string; Operation: string; Value: string }>,
  pageSize = 100
): Promise<JsonRecord[]> {
  const path = buildQueryPath("CommitmentInvoices");
  const params = buildQueryParams({ schema: false, pageNumber: 0, pageSize });
  const body = {
    SelectedFields: [
      "CommitmentInvoice/CommitmentInvoiceId",
      "CommitmentInvoice/CommitmentId",
      "CommitmentInvoice/PortalId",
      "CommitmentInvoice/InvoiceNumber",
      "CommitmentInvoice/InvoiceAmount",
      "CommitmentInvoice/InvoiceStatus",
      "CommitmentInvoice/RetainageAmount",
      "CommitmentInvoice/AmountRetained",
      "CommitmentInvoice/AmountLessRetainage",
      "CommitmentInvoice/RetainageReleased",
      "CommitmentInvoice/DateCreated",
      "CommitmentInvoice/Description",
      "CommitmentInvoice/CustomFields/Period From",
      "CommitmentInvoice/CustomFields/Period To",
    ],
    Filters: filters,
  };

  const data = await client.post(path, body, params);
  return extractRecords(data);
}

async function queryCommitments(
  client: EBuilderClient,
  filters: Array<{ Field: string; Operation: string; Value: string }>
): Promise<JsonRecord[]> {
  const path = buildQueryPath("Commitments");
  const params = buildQueryParams({ schema: false, pageNumber: 0, pageSize: 20 });
  const body = {
    SelectedFields: [
      "Commitment/CommitmentId",
      "Commitment/CommitmentNumber",
      "Commitment/CompanyId",
      "Commitment/PortalId",
      "Commitment/OriginalContractValue",
      "Commitment/CurrentContractValue",
      "Commitment/ApprovedChanges",
      "Commitment/PendingChanges",
      "Commitment/RetainagePercent",
      "Commitment/CurrentRetainageHeld",
      "Commitment/CostControlTolerancePercent",
      "Commitment/ActualsApproved",
      "Commitment/RemainingToBePaid",
    ],
    Filters: filters,
  };

  const data = await client.post(path, body, params);
  return extractRecords(data);
}

async function queryCommitmentChanges(
  client: EBuilderClient,
  commitmentId: string
): Promise<JsonRecord[]> {
  const path = buildQueryPath("CommitmentChanges");
  const params = buildQueryParams({ schema: false, pageNumber: 0, pageSize: 100 });
  const body = {
    SelectedFields: [
      "CommitmentChange/CommitmentChangeId",
      "CommitmentChange/ChangeNumber",
      "CommitmentChange/Amount",
      "CommitmentChange/CommitmentChangeStatus",
      "CommitmentChange/CommitmentId",
    ],
    Filters: [
      {
        Field: "CommitmentChange/CommitmentId",
        Operation: "EQ",
        Value: commitmentId,
      },
    ],
  };

  const data = await client.post(path, body, params);
  return extractRecords(data);
}

async function getSubResource(
  client: EBuilderClient,
  resource: "CommitmentInvoices" | "Commitments",
  recordId: string
): Promise<unknown> {
  const path = buildGetPath(resource, recordId, "items");
  return client.get(path);
}

export interface AssembleEvidenceInput {
  commitmentInvoiceId?: string;
  invoiceNumber?: string;
  commitmentNumber?: string;
  projectSearchTerm?: string;
  commitmentId?: string;
}

export interface AssembleEvidenceResult {
  status: "complete" | "partial" | "incomplete";
  pack?: EvidencePack;
  stepsCompleted: string[];
  nextSteps?: string[];
  agentDirective?: string;
}

/**
 * Resolve invoice + commitment context and assemble a normalized evidence pack
 * for deterministic invoice review checks.
 */
export async function assembleInvoiceEvidencePack(
  client: EBuilderClient,
  input: AssembleEvidenceInput
): Promise<AssembleEvidenceResult> {
  const steps: string[] = [];
  let invoiceRecords: JsonRecord[] = [];

  if (input.commitmentInvoiceId) {
    steps.push(`resolve invoice by id ${input.commitmentInvoiceId}`);
    invoiceRecords = await queryCommitmentInvoices(client, [
      {
        Field: "CommitmentInvoice/CommitmentInvoiceId",
        Operation: "EQ",
        Value: input.commitmentInvoiceId,
      },
    ]);
  } else {
    const filters: Array<{ Field: string; Operation: string; Value: string }> =
      [];

    if (input.invoiceNumber) {
      filters.push({
        Field: "CommitmentInvoice/InvoiceNumber",
        Operation: "LIKE",
        Value: input.invoiceNumber.includes("%")
          ? input.invoiceNumber
          : `%${input.invoiceNumber}%`,
      });
    }

    if (input.commitmentId) {
      filters.push({
        Field: "CommitmentInvoice/CommitmentId",
        Operation: "EQ",
        Value: input.commitmentId,
      });
    }

    if (input.projectSearchTerm) {
      steps.push(`resolve_project("${input.projectSearchTerm}")`);
      const projectResult = await searchProjects(
        client,
        input.projectSearchTerm,
        5
      );
      if (projectResult.matches.length > 0 && projectResult.matches[0].portalId) {
        filters.push({
          Field: "CommitmentInvoice/PortalId",
          Operation: "LIKE",
          Value: projectResult.matches[0].portalId,
        });
      }
    }

    if (filters.length === 0) {
      return {
        status: "incomplete",
        stepsCompleted: steps,
        nextSteps: [
          "Provide commitmentInvoiceId, or invoiceNumber with projectSearchTerm/commitmentId",
        ],
        agentDirective:
          "Ask the user for invoice number and project/commitment if not provided.",
      };
    }

    steps.push("query_records(CommitmentInvoices)");
    invoiceRecords = await queryCommitmentInvoices(client, filters, 50);
  }

  if (invoiceRecords.length === 0) {
    return {
      status: "incomplete",
      stepsCompleted: steps,
      nextSteps: [
        "Broaden invoice filters (LIKE wildcards) or verify invoice number/project",
        "Try resolve_project then query CommitmentInvoices by PortalId",
      ],
      agentDirective: "DO NOT stop — retry with broader filters before responding.",
    };
  }

  const invoiceRecord = invoiceRecords[0];
  const invoiceHeaderRaw =
    (invoiceRecord.CommitmentInvoice as JsonRecord | undefined) ?? invoiceRecord;
  const invoiceId = String(invoiceHeaderRaw.CommitmentInvoiceId ?? "");
  const commitmentId = String(
    input.commitmentId ?? invoiceHeaderRaw.CommitmentId ?? ""
  );

  steps.push(`get_record_detail(CommitmentInvoices/${invoiceId}/items)`);
  const invoiceItemsData = await getSubResource(
    client,
    "CommitmentInvoices",
    invoiceId
  );

  const invoice = normalizeInvoiceHeader(invoiceRecord, invoiceItemsData);
  if (!invoice) {
    return {
      status: "partial",
      stepsCompleted: steps,
      nextSteps: ["Retry invoice normalization with schema discovery"],
    };
  }

  let commitmentRecords: JsonRecord[] = [];
  if (commitmentId) {
    steps.push(`query_records(Commitments) for ${commitmentId}`);
    commitmentRecords = await queryCommitments(client, [
      {
        Field: "Commitment/CommitmentId",
        Operation: "EQ",
        Value: commitmentId,
      },
    ]);
  } else if (input.commitmentNumber) {
    commitmentRecords = await queryCommitments(client, [
      {
        Field: "Commitment/CommitmentNumber",
        Operation: "LIKE",
        Value: input.commitmentNumber.includes("%")
          ? input.commitmentNumber
          : `%${input.commitmentNumber}%`,
      },
    ]);
  }

  if (commitmentRecords.length === 0) {
    return {
      status: "partial",
      pack: undefined,
      stepsCompleted: steps,
      nextSteps: [
        "Query Commitments by CommitmentId from invoice header",
        "Call discover_query_schema(Commitments) if filters fail",
      ],
      agentDirective:
        "Invoice found but commitment missing — query Commitments before responding.",
    };
  }

  const commitmentRecord = commitmentRecords[0];
  const commitmentHeaderRaw =
    (commitmentRecord.Commitment as JsonRecord | undefined) ?? commitmentRecord;
  const resolvedCommitmentId = String(
    commitmentHeaderRaw.CommitmentId ?? commitmentId
  );

  steps.push(`get_record_detail(Commitments/${resolvedCommitmentId}/items)`);
  const commitmentItemsData = await getSubResource(
    client,
    "Commitments",
    resolvedCommitmentId
  );
  const commitment = normalizeCommitment(commitmentRecord, commitmentItemsData);

  if (!commitment) {
    return {
      status: "partial",
      stepsCompleted: steps,
      nextSteps: ["Retry commitment normalization"],
    };
  }

  steps.push("query prior CommitmentInvoices on same commitment");
  const allInvoices = await queryCommitmentInvoices(client, [
    {
      Field: "CommitmentInvoice/CommitmentId",
      Operation: "EQ",
      Value: resolvedCommitmentId,
    },
  ], 100);

  const sortedPrior = allInvoices
    .filter((record) => {
      const header =
        (record.CommitmentInvoice as JsonRecord | undefined) ?? record;
      return String(header.CommitmentInvoiceId ?? "") !== invoice.id;
    })
    .sort((a, b) => {
      const aNum = toNumber(
        ((a.CommitmentInvoice as JsonRecord | undefined) ?? a).InvoiceNumber
      );
      const bNum = toNumber(
        ((b.CommitmentInvoice as JsonRecord | undefined) ?? b).InvoiceNumber
      );
      return bNum - aNum;
    })
    .slice(0, 5);

  const priorInvoices = sortedPrior
    .map((record) => normalizePriorInvoice(record))
    .filter((summary): summary is NonNullable<typeof summary> => summary !== null);

  for (const prior of priorInvoices.slice(0, 3)) {
    try {
      const priorItems = await getSubResource(
        client,
        "CommitmentInvoices",
        prior.id
      );
      prior.lines = normalizeInvoiceLines(extractDetails(priorItems), prior.id);
    } catch {
      prior.lines = [];
    }
  }

  steps.push("query_records(CommitmentChanges)");
  const changeRecords = await queryCommitmentChanges(client, resolvedCommitmentId);
  const changeOrders = changeRecords
    .map((record) => {
      const change =
        (record.CommitmentChange as JsonRecord | undefined) ?? record;
      const id = String(change.CommitmentChangeId ?? "");
      if (!id) {
        return null;
      }
      return {
        id,
        number: String(change.ChangeNumber ?? ""),
        amount: toNumber(change.Amount),
        status: mapChangeOrderStatus(change.CommitmentChangeStatus),
        ref: `CommitmentChanges/${id}`,
      };
    })
    .filter(
      (
        change
      ): change is EvidencePack["changeOrders"][number] => change !== null
    );

  const pack: EvidencePack = {
    invoice,
    commitment,
    priorInvoices,
    changeOrders,
    budget: {
      balanceToFinish: Math.max(
        commitment.currentContractValue - commitment.actualsApproved,
        0
      ),
      ref: commitment.ref,
    },
    assemblySteps: steps,
  };

  return {
    status: "complete",
    pack,
    stepsCompleted: steps,
    agentDirective:
      "Call evaluate_invoice_checks with this pack and the user's review config, then produce an Advisory Brief.",
  };
}
