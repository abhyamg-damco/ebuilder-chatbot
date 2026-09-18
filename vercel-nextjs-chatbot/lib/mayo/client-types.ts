import type {
  MayoComparisonOutput,
  MayoDocumentCategory,
  MayoDocumentExtractionData,
  MayoDocumentStage,
  MayoNormalizedRule,
} from "./types";

export type MayoClientCase = {
  id: string;
  name: string;
  projectName: string;
  projectNumber: string | null;
  description: string | null;
  status: "active" | "in_review" | "completed" | "archived";
  openaiVectorStoreId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MayoClientDocument = {
  id: string;
  caseId: string;
  category: MayoDocumentCategory;
  stage: MayoDocumentStage;
  revision: number;
  paymentApplicationNumber: string | null;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  status:
    | "uploading"
    | "uploaded"
    | "indexing"
    | "ready"
    | "failed"
    | "deleted";
  openaiFileId: string | null;
  indexingError: string | null;
  uploadedAt: string;
  indexedAt: string | null;
};

export type MayoClientExtraction = {
  id: string;
  documentId: string;
  status: "pending" | "processing" | "completed" | "needs_review" | "failed";
  model: string;
  data: MayoDocumentExtractionData | null;
  confidence: number | null;
  missingFields: string[];
  errorMessage: string | null;
  updatedAt: string;
};

export type MayoClientEvidence = {
  id: string;
  documentId: string | null;
  openaiFileId: string | null;
  filename: string;
  excerpt: string;
  pageNumber: number | null;
  pageNumberVerified: boolean;
};

export type MayoClientDecision = {
  id: string;
  decision: string;
  comment: string | null;
  createdAt: string;
};

export type MayoClientFinding = {
  id: string;
  ruleFamilyId: string | null;
  fingerprint: string;
  ruleCode: string;
  title: string;
  description: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  amountImpact: string | null;
  confidence: number;
  source: "deterministic" | "semantic" | "comparison";
  recommendation: string;
  status: "open" | "accepted" | "rejected" | "resolved" | "carried_forward";
  assignedReviewerId: string | null;
  evidence: MayoClientEvidence[];
  decisions: MayoClientDecision[];
  createdAt: string;
};

export type MayoClientReviewRun = {
  id: string;
  status: "queued" | "running" | "awaiting_review" | "completed" | "failed";
  model: string;
  summary: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export type MayoClientComparison = {
  id: string;
  draftDocumentId: string;
  finalDocumentId: string;
  status: "queued" | "running" | "completed" | "failed";
  summary: string | null;
  data: MayoComparisonOutput | null;
  errorMessage: string | null;
  createdAt: string;
};

export type MayoClientSync = {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  result: unknown;
  errorMessage: string | null;
  createdAt: string;
};

export type MayoClientAuditEvent = {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type MayoClientRuleFamily = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};

export type MayoCaseSnapshot = {
  case: MayoClientCase;
  membership: {
    role: "owner" | "admin" | "reviewer" | "auditor";
  };
  documents: MayoClientDocument[];
  extractions: MayoClientExtraction[];
  reviewRuns: MayoClientReviewRun[];
  findings: MayoClientFinding[];
  comparisons: MayoClientComparison[];
  integrationSyncs: MayoClientSync[];
  auditEvents: MayoClientAuditEvent[];
  ruleFamilies: MayoClientRuleFamily[];
  rules: MayoNormalizedRule[];
};
