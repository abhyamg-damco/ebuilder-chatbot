import type {
  EvidencePack,
  InvoiceLine,
  InvoiceSummary,
  SovLine,
} from "./types.js";

type JsonRecord = Record<string, unknown>;

/** Parse numeric values from API strings or numbers. */
export function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

/** Read nested property using slash or camelCase path segments. */
export function getNestedValue(record: JsonRecord, path: string): unknown {
  const segments = path.includes("/") ? path.split("/") : path.split(".");
  let current: unknown = record;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== "object") {
      return undefined;
    }
    current = (current as JsonRecord)[segment];
  }

  return current;
}

function extractRecords(data: unknown): JsonRecord[] {
  if (!data || typeof data !== "object") {
    return [];
  }
  const obj = data as JsonRecord;
  if (Array.isArray(obj.records)) {
    return obj.records.filter(
      (item): item is JsonRecord => typeof item === "object" && item !== null
    );
  }
  return [];
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

/** Normalize invoice line items from /items details array. */
export function normalizeInvoiceLines(
  details: JsonRecord[],
  invoiceId: string
): InvoiceLine[] {
  return details.map((detail, index) => {
    const lineNo = String(detail.itemNumber ?? index + 1);
    const thisPeriod = toNumber(
      detail.amountThisPeriod ?? detail.amount ?? detail.amountThisPeriod
    );
    const amount = toNumber(detail.amount ?? thisPeriod);
    const itemId = String(detail.invoiceItemId ?? `${invoiceId}-line-${lineNo}`);

    return {
      lineNo,
      description: String(detail.description ?? ""),
      budgetLineItemId: detail.budgetLineItemId
        ? String(detail.budgetLineItemId)
        : undefined,
      thisPeriod: thisPeriod || amount,
      amount,
      retainagePercent: toNumber(detail.retainagePercent),
      retainageAmount: toNumber(detail.netRetainageAmount),
      storedMaterials: toNumber(detail.totalMaterialsPresentlyStored) || undefined,
      ref: `CommitmentInvoiceItems/${itemId}`,
    };
  });
}

/** Normalize SOV lines from commitment /items details array. */
export function normalizeSovLines(
  details: JsonRecord[],
  commitmentId: string
): SovLine[] {
  return details.map((detail, index) => {
    const lineNo = String(detail.itemNumber ?? detail.lineNumber ?? index + 1);
    const scheduledValue = toNumber(
      detail.originalAmount ?? detail.amount ?? detail.scheduledValue
    );
    const currentValue = toNumber(
      detail.currentAmount ?? detail.amount ?? scheduledValue
    );
    const actualsApproved = toNumber(detail.actualsApproved);
    const remainingToBePaid = toNumber(
      detail.remainingToBePaid ?? Math.max(currentValue - actualsApproved, 0)
    );
    const itemId = String(
      detail.commitmentItemID ?? detail.commitmentItemId ?? `${commitmentId}-sov-${lineNo}`
    );

    return {
      lineNo,
      description: String(detail.description ?? detail.scopeOfWork ?? ""),
      budgetLineItemId: detail.budgetLineItemID
        ? String(detail.budgetLineItemID)
        : detail.budgetLineItemId
          ? String(detail.budgetLineItemId)
          : undefined,
      scheduledValue,
      currentValue,
      actualsApproved,
      remainingToBePaid,
      approvedChanges: toNumber(detail.approvedChanges),
      ref: `CommitmentItems/${itemId}`,
    };
  });
}

/** Normalize a CommitmentInvoices query record into invoice header fields. */
export function normalizeInvoiceHeader(
  record: JsonRecord,
  itemsData?: unknown
): EvidencePack["invoice"] | null {
  const invoice =
    (record.CommitmentInvoice as JsonRecord | undefined) ?? record;
  const id = String(invoice.CommitmentInvoiceId ?? invoice.invoiceId ?? "");
  if (!id) {
    return null;
  }

  const itemsRecord = extractRecords(itemsData)[0] ?? itemsData;
  const headerFromItems =
    itemsRecord && typeof itemsRecord === "object"
      ? (itemsRecord as JsonRecord)
      : undefined;

  const customFields = (invoice.CustomFields ?? {}) as JsonRecord;
  const details = extractDetails(itemsData);
  const lines =
    details.length > 0
      ? normalizeInvoiceLines(details, id)
      : normalizeInvoiceLines(
          [
            {
              itemNumber: "001",
              description: String(
                invoice.Description ?? headerFromItems?.description ?? "Invoice total"
              ),
              amount: toNumber(invoice.InvoiceAmount ?? headerFromItems?.invoiceAmount),
              amountThisPeriod: toNumber(
                invoice.InvoiceAmount ?? headerFromItems?.invoiceAmount
              ),
              netRetainageAmount: toNumber(
                invoice.RetainageAmount ??
                  invoice.AmountRetained ??
                  headerFromItems?.amountRetained
              ),
              retainagePercent: 0,
              invoiceItemId: `${id}-summary`,
            },
          ],
          id
        );

  return {
    id,
    number: String(invoice.InvoiceNumber ?? headerFromItems?.invoiceNumber ?? ""),
    status: String(invoice.InvoiceStatus ?? headerFromItems?.status ?? ""),
    periodFrom: customFields["Period From"]
      ? String(customFields["Period From"])
      : undefined,
    periodTo: customFields["Period To"]
      ? String(customFields["Period To"])
      : undefined,
    invoiceAmount: toNumber(
      invoice.InvoiceAmount ?? headerFromItems?.invoiceAmount
    ),
    amountRetained: toNumber(
      invoice.RetainageAmount ??
        invoice.AmountRetained ??
        headerFromItems?.amountRetained
    ),
    retainageReleased: toNumber(
      invoice.RetainageReleased ?? headerFromItems?.retainageReleased
    ),
    amountLessRetainage: toNumber(
      invoice.AmountLessRetainage ?? headerFromItems?.amountLessRetainage
    ),
    commitmentId: String(
      invoice.CommitmentId ?? headerFromItems?.commitmentId ?? ""
    ),
    projectId: invoice.PortalId
      ? String(invoice.PortalId)
      : headerFromItems?.projectId
        ? String(headerFromItems.projectId)
        : undefined,
    companyId: headerFromItems?.companyId
      ? String(headerFromItems.companyId)
      : undefined,
    companyName: headerFromItems?.companyName
      ? String(headerFromItems.companyName)
      : undefined,
    lines,
    ref: `CommitmentInvoices/${id}`,
  };
}

/** Normalize commitment header + SOV from query record and /items response. */
export function normalizeCommitment(
  record: JsonRecord,
  itemsData?: unknown
): EvidencePack["commitment"] | null {
  const commitment =
    (record.Commitment as JsonRecord | undefined) ?? record;
  const id = String(commitment.CommitmentId ?? commitment.commitmentID ?? "");
  if (!id) {
    return null;
  }

  const itemsRecord = extractRecords(itemsData)[0];
  const header = itemsRecord ?? commitment;
  const details = extractDetails(itemsData);
  const sov =
    details.length > 0
      ? normalizeSovLines(details, id)
      : normalizeSovLines(
          [
            {
              itemNumber: String(header.commitmentNumber ?? commitment.CommitmentNumber ?? "001"),
              description: String(
                header.description ?? commitment.Description ?? "Commitment total"
              ),
              amount: toNumber(
                header.currentCommitmentValue ??
                  commitment.CurrentContractValue ??
                  commitment.OriginalContractValue
              ),
              originalAmount: toNumber(
                header.originalCommitmentValue ??
                  commitment.OriginalContractValue
              ),
              actualsApproved: toNumber(
                header.actualsApproved ?? commitment.ActualsApproved
              ),
              remainingToBePaid: toNumber(
                header.remainingToBePaid ?? commitment.RemainingToBePaid
              ),
              approvedChanges: toNumber(
                header.approvedChanges ?? commitment.ApprovedChanges
              ),
              commitmentItemID: `${id}-summary`,
            },
          ],
          id
        );

  return {
    id,
    number: String(
      header.commitmentNumber ?? commitment.CommitmentNumber ?? ""
    ),
    companyId: header.companyID
      ? String(header.companyID)
      : commitment.CompanyId
        ? String(commitment.CompanyId)
        : undefined,
    companyName: header.companyName
      ? String(header.companyName)
      : undefined,
    originalContractValue: toNumber(
      header.originalCommitmentValue ?? commitment.OriginalContractValue
    ),
    currentContractValue: toNumber(
      header.currentCommitmentValue ?? commitment.CurrentContractValue
    ),
    approvedChanges: toNumber(
      header.approvedChanges ?? commitment.ApprovedChanges
    ),
    pendingChanges: toNumber(
      header.pendingChanges ?? commitment.PendingChanges
    ),
    retainagePercent: toNumber(
      header.retainagePercent ?? commitment.RetainagePercent
    ),
    currentRetainageHeld: toNumber(
      header.currentRetainageHeld ?? commitment.CurrentRetainageHeld
    ),
    costControlTolerancePercent: toNumber(
      header.costControlTolerancePercent ??
        commitment.CostControlTolerancePercent ??
        10
    ),
    actualsApproved: toNumber(
      header.actualsApproved ?? commitment.ActualsApproved
    ),
    remainingToBePaid: toNumber(
      header.remainingToBePaid ?? commitment.RemainingToBePaid
    ),
    sov,
    ref: `Commitments/${id}`,
  };
}

/** Normalize prior invoice summaries (header only; lines optional). */
export function normalizePriorInvoice(
  record: JsonRecord,
  lines: InvoiceLine[] = []
): InvoiceSummary | null {
  const invoice = (record.CommitmentInvoice as JsonRecord | undefined) ?? record;
  const id = String(invoice.CommitmentInvoiceId ?? "");
  if (!id) {
    return null;
  }

  return {
    id,
    number: String(invoice.InvoiceNumber ?? ""),
    status: String(invoice.InvoiceStatus ?? ""),
    invoiceAmount: toNumber(invoice.InvoiceAmount),
    amountRetained: toNumber(invoice.RetainageAmount ?? invoice.AmountRetained),
    dateCreated: invoice.DateCreated ? String(invoice.DateCreated) : undefined,
    lines,
    ref: `CommitmentInvoices/${id}`,
  };
}

/** Map commitment change status to approved/pending/other. */
export function mapChangeOrderStatus(
  status: unknown
): "approved" | "pending" | "other" {
  const normalized = String(status ?? "").toLowerCase();
  if (normalized.includes("approved")) {
    return "approved";
  }
  if (
    normalized.includes("pending") ||
    normalized.includes("submitted") ||
    normalized.includes("draft")
  ) {
    return "pending";
  }
  return "other";
}
