"use client";

import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  ClockIcon,
  CloudUploadIcon,
  DatabaseIcon,
  FileCheck2Icon,
  FileSearchIcon,
  FileTextIcon,
  LoaderIcon,
  PlayIcon,
  RefreshCwIcon,
  ScaleIcon,
  ScrollTextIcon,
  Settings2Icon,
  ShieldCheckIcon,
  Trash2Icon,
  XCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import useSWR, { type KeyedMutator } from "swr";
import { MessageResponse } from "@/components/ai-elements/message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  MayoCaseSnapshot,
  MayoClientDocument,
  MayoClientFinding,
} from "@/lib/mayo/client-types";
import type { MayoDocumentCategory, MayoDocumentStage } from "@/lib/mayo/types";
import { cn, fetcher } from "@/lib/utils";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const POLL_INTERVAL_MS = 3000;

type WorkspaceTab =
  | "documents"
  | "extractions"
  | "findings"
  | "comparison"
  | "ebuilder"
  | "rules"
  | "audit";

type TabDefinition = {
  id: WorkspaceTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const primaryTabs: TabDefinition[] = [
  { id: "documents", label: "Documents", icon: FileTextIcon },
  { id: "findings", label: "Findings", icon: ShieldCheckIcon },
];

/** Reference and configuration panels, reachable from "More". */
const secondaryTabs: TabDefinition[] = [
  { id: "extractions", label: "Extractions", icon: DatabaseIcon },
  { id: "comparison", label: "Final comparison", icon: ScaleIcon },
  { id: "ebuilder", label: "eBuilder", icon: RefreshCwIcon },
  { id: "rules", label: "Rules", icon: Settings2Icon },
  { id: "audit", label: "Audit", icon: ScrollTextIcon },
];

/** Placeholder sent at upload. Extraction reports the real documentType. */
const DEFAULT_UPLOAD_CATEGORY: MayoDocumentCategory = "other";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.ceil(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function inferMayoMimeType(file: File): string {
  if (file.type) {
    return file.type;
  }
  const extension = file.name.split(".").pop()?.toLowerCase();
  const byExtension: Record<string, string> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    txt: "text/plain",
    md: "text/markdown",
    json: "application/json",
  };
  return extension
    ? (byExtension[extension] ?? "application/octet-stream")
    : "application/octet-stream";
}

/**
 * True while any stage of the pipeline is still moving. Drives both the polling
 * interval and the progress banner, so an idle case stops polling entirely.
 */
function hasPendingOperations(snapshot: MayoCaseSnapshot | undefined): boolean {
  return Boolean(
    snapshot?.documents.some((document) =>
      ["uploading", "uploaded", "indexing"].includes(document.status)
    ) ||
      snapshot?.extractions.some((extraction) =>
        ["pending", "processing"].includes(extraction.status)
      ) ||
      snapshot?.reviewRuns.some((run) =>
        ["queued", "running"].includes(run.status)
      ) ||
      snapshot?.comparisons.some((comparison) =>
        ["queued", "running"].includes(comparison.status)
      ) ||
      snapshot?.integrationSyncs.some((sync) =>
        ["queued", "running"].includes(sync.status)
      )
  );
}

/**
 * Whether the reviewer still needs a way to trigger extraction by hand. The
 * pipeline handles documents uploaded in this session, so this is the escape
 * hatch for older documents and for extractions that failed.
 */
function needsManualExtraction(
  document: MayoClientDocument,
  extractions: MayoCaseSnapshot["extractions"]
): boolean {
  const extraction = extractions.find(
    (candidate) => candidate.documentId === document.id
  );
  return !extraction || extraction.status === "failed";
}

/** Distinguishes a retry from a first attempt, so the button can say which it is. */
function extractionFailed(
  document: MayoClientDocument,
  extractions: MayoCaseSnapshot["extractions"]
): boolean {
  return extractions.some(
    (candidate) =>
      candidate.documentId === document.id && candidate.status === "failed"
  );
}

/**
 * The figures a deterministic finding was computed from, pulled straight out of
 * the extraction and the rule's own configuration.
 *
 * This deliberately does not recompute anything. The finding's description
 * already carries the result, so duplicating the arithmetic here would risk the
 * screen and the engine drifting apart. All this does is show which numbers went
 * in, and where they came from, so a reviewer can judge the result instead of
 * taking it on trust.
 */
function findingInputs(
  finding: MayoClientFinding,
  data: MayoCaseSnapshot
): Array<{ label: string; value: string }> {
  const documentId = finding.evidence.find(
    (evidence) => evidence.documentId
  )?.documentId;
  const extracted = data.extractions.find(
    (extraction) => extraction.documentId === documentId
  )?.data;
  const rule = data.rules.find(
    (candidate) => candidate.code === finding.ruleCode
  );
  if (!extracted) {
    return [];
  }

  const rows: Array<{ label: string; value: string }> = [];
  const push = (label: string, value: string | null) => {
    if (value !== null) {
      rows.push({ label, value });
    }
  };
  const money = (value: number | null | undefined) =>
    value === null || value === undefined ? null : formatMoney(value);

  if (finding.ruleCode === "RETAINAGE") {
    push("Completed to date", money(extracted.totalCompletedAndStored));
    push(
      "Contract retainage rate",
      extracted.retainagePercent === null
        ? null
        : `${extracted.retainagePercent > 1 ? extracted.retainagePercent : extracted.retainagePercent * 100}%`
    );
    push("Retainage withheld", money(extracted.retainageAmount));
  } else if (finding.ruleCode === "MATH") {
    push(
      "Line items this period",
      money(
        extracted.lineItems.reduce(
          (sum, line) => sum + (line.currentApplication ?? 0),
          0
        )
      )
    );
    push("Stated current payment", money(extracted.currentPayment));
  } else if (finding.ruleCode === "OVER_BILLING") {
    push("Contract value", money(extracted.contractValue));
    push("Completed to date", money(extracted.totalCompletedAndStored));
  } else if (finding.ruleCode === "CO_UNAPPROVED") {
    push("Pending change orders", money(extracted.pendingChangeOrders));
    push(
      "Billed against pending",
      money(extracted.billedAgainstPendingChangeOrders)
    );
  } else if (finding.ruleCode === "LARGE_PERIOD") {
    push("This period", money(extracted.currentPayment));
    push("Previous payments", money(extracted.previousPayments));
  }

  if (rows.length === 0) {
    return [];
  }
  if (typeof rule?.config.toleranceUsd === "number") {
    push("Tolerance", formatMoney(rule.config.toleranceUsd));
  } else if (typeof rule?.config.tolerancePct === "number") {
    push("Tolerance", `${(rule.config.tolerancePct * 100).toFixed(2)}%`);
  }
  return rows;
}

/**
 * The detected document type, or null while it is still unknown. Classification
 * runs during indexing, so the stored category is a placeholder until the
 * document reaches "ready" and is the detected type from then on.
 */
function detectedDocumentCategory(document: MayoClientDocument): string | null {
  return document.status === "ready" ? document.category : null;
}

function statusBadgeVariant(status: string) {
  if (["failed", "rejected", "critical"].includes(status)) {
    return "destructive" as const;
  }
  if (["ready", "completed", "accepted", "resolved"].includes(status)) {
    return "secondary" as const;
  }
  return "outline" as const;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${basePath}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed");
  }
  return payload as T;
}

function uploadToResumableUrl(input: {
  url: string;
  file: File;
  mimeType: string;
  onProgress: (progress: number) => void;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", input.url);
    xhr.setRequestHeader("Content-Type", input.mimeType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        input.onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onerror = () => reject(new Error("GCS upload failed"));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`GCS upload failed (${xhr.status})`));
      }
    };
    xhr.send(input.file);
  });
}

export function MayoCaseWorkspace({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("documents");
  const [showMore, setShowMore] = useState(false);
  const [confirmingCaseDelete, setConfirmingCaseDelete] = useState(false);
  const [deletingCase, setDeletingCase] = useState(false);
  /**
   * Polling is state-driven rather than derived inline, so that starting the
   * pipeline re-renders with a live interval. A value computed from the hook's
   * own data cannot restart polling once it has settled on zero.
   */
  const [shouldPoll, setShouldPoll] = useState(false);
  const { data, error, isLoading, mutate } = useSWR<MayoCaseSnapshot>(
    `${basePath}/api/mayo/cases/${caseId}`,
    fetcher,
    {
      refreshInterval: shouldPoll ? POLL_INTERVAL_MS : 0,
      // The chain has to keep advancing even when the tab is not in front.
      refreshWhenHidden: true,
    }
  );
  const pendingOperations = useMemo(() => hasPendingOperations(data), [data]);

  /**
   * Drives the index -> extract -> review chain off the case snapshot poll.
   *
   * Scoped to documents uploaded in this browser session via queuedDocumentIds,
   * so opening a case that already holds findings never starts a review.
   *
   * KNOWN LIMITATION: the chain only advances while the tab is open. Closing it
   * mid-pipeline leaves documents indexed but unextracted. The durable home for
   * this is server-side chaining from the document-complete handler.
   */
  const [queuedDocumentIds, setQueuedDocumentIds] = useState<string[]>([]);
  const [failedUploadNames, setFailedUploadNames] = useState<string[]>([]);
  const [failedExtractionIds, setFailedExtractionIds] = useState<string[]>([]);
  const [batchConfirmed, setBatchConfirmed] = useState(false);
  const requestedExtractionIds = useRef<Set<string>>(new Set());
  const requestedReview = useRef(false);
  const seenDocumentIds = useRef<Set<string>>(new Set());

  /**
   * Drop documents that have left the case, otherwise deleting one mid-batch
   * leaves the batch permanently unsettled and polling forever. Only documents
   * this workspace has actually seen in a snapshot are pruned: a freshly
   * uploaded one has not appeared yet and must not be mistaken for deleted.
   */
  useEffect(() => {
    if (!data) {
      return;
    }
    for (const document of data.documents) {
      seenDocumentIds.current.add(document.id);
    }
    setQueuedDocumentIds((current) => {
      const next = current.filter(
        (id) =>
          !seenDocumentIds.current.has(id) ||
          data.documents.some((document) => document.id === id)
      );
      return next.length === current.length ? current : next;
    });
  }, [data]);

  const queueUploadedDocuments = useCallback(
    (documentIds: string[], failedNames: string[]) => {
      requestedReview.current = false;
      setBatchConfirmed(false);
      setFailedUploadNames(failedNames);
      setQueuedDocumentIds((current) => [
        ...new Set([...current, ...documentIds]),
      ]);
    },
    []
  );

  const startReview = useCallback(async () => {
    try {
      await apiRequest(`/api/mayo/cases/${caseId}/reviews`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      toast.success("Review queued");
      setActiveTab("findings");
      await mutate();
    } catch (reviewError) {
      toast.error(
        reviewError instanceof Error
          ? reviewError.message
          : "Unable to start review"
      );
    }
  }, [caseId, mutate]);

  /**
   * A review is a chargeable model call over the whole case, so it only starts on
   * its own when the batch came through cleanly. If anything failed, the reviewer
   * decides: add the missing documents to this batch, or review what is here.
   */
  const batchState = useMemo(() => {
    if (!data || queuedDocumentIds.length === 0) {
      return { working: false, failed: false, clean: false };
    }
    const queued = data.documents.filter((document) =>
      queuedDocumentIds.includes(document.id)
    );
    const extractionFor = (documentId: string) =>
      data.extractions.find(
        (extraction) => extraction.documentId === documentId
      );

    const working =
      queued.length !== queuedDocumentIds.length ||
      queued.some((document) => {
        if (
          document.status === "failed" ||
          failedExtractionIds.includes(document.id)
        ) {
          return false;
        }
        if (document.status !== "ready") {
          return true;
        }
        const extraction = extractionFor(document.id);
        return (
          !extraction || ["pending", "processing"].includes(extraction.status)
        );
      });

    const failed =
      failedUploadNames.length > 0 ||
      queued.some(
        (document) =>
          document.status === "failed" ||
          failedExtractionIds.includes(document.id) ||
          extractionFor(document.id)?.status === "failed"
      );

    return { working, failed, clean: !(working || failed) };
  }, [data, queuedDocumentIds, failedUploadNames, failedExtractionIds]);

  // Keep polling while anything is moving, and while the batch is still working,
  // otherwise the client never learns that indexing finished. Stop once the batch
  // has stalled on a failure, so a blocked case does not poll forever.
  useEffect(() => {
    setShouldPoll(
      hasPendingOperations(data) || (batchState.working && batchConfirmed)
    );
  }, [data, batchState.working, batchConfirmed]);

  /**
   * Documents that have been read and classified but not yet extracted.
   *
   * Derived from the case itself rather than from what this browser session
   * uploaded, so the checkpoint survives a reload. Leaving the page mid-batch
   * used to strand the documents with no way to confirm or correct them.
   */
  const unconfirmedDocuments = useMemo(() => {
    if (!data) {
      return [];
    }
    return data.documents.filter(
      (document) =>
        document.status === "ready" &&
        !data.extractions.some(
          (extraction) => extraction.documentId === document.id
        )
    );
  }, [data]);

  const awaitingConfirmation =
    !batchConfirmed &&
    unconfirmedDocuments.length > 0 &&
    !data?.reviewRuns.some((run) => ["queued", "running"].includes(run.status));

  useEffect(() => {
    if (!data || !batchConfirmed) {
      return;
    }
    for (const document of unconfirmedDocuments) {
      if (requestedExtractionIds.current.has(document.id)) {
        continue;
      }
      requestedExtractionIds.current.add(document.id);
      apiRequest(`/api/mayo/cases/${caseId}/documents/${document.id}/extract`, {
        method: "POST",
      })
        .then(() => mutate())
        .catch((extractError) => {
          // A request that fails outright leaves no extraction row behind, so
          // record it here or the batch waits on a document that will never
          // settle.
          setFailedExtractionIds((current) => [
            ...new Set([...current, document.id]),
          ]);
          toast.error(
            extractError instanceof Error
              ? extractError.message
              : `Unable to read ${document.originalFilename}`
          );
        });
    }
  }, [caseId, data, mutate, batchConfirmed, unconfirmedDocuments]);

  /**
   * Documents have been extracted since the last review ran, so the findings on
   * screen no longer reflect the case.
   *
   * Derived from the case rather than from this session, so reloading the page
   * mid-flow cannot strand a case with no way to produce findings.
   */
  const needsReview = useMemo(() => {
    if (!data) {
      return false;
    }
    const ready = data.documents.filter(
      (document) => document.status === "ready"
    );
    if (ready.length === 0) {
      return false;
    }
    const settled = ready.every((document) =>
      data.extractions.some(
        (extraction) =>
          extraction.documentId === document.id &&
          !["pending", "processing"].includes(extraction.status)
      )
    );
    if (!settled) {
      return false;
    }
    if (
      data.reviewRuns.some((run) => ["queued", "running"].includes(run.status))
    ) {
      return false;
    }
    const newestExtraction = Math.max(
      ...data.extractions.map((extraction) =>
        new Date(extraction.updatedAt).getTime()
      )
    );
    const newestReview = data.reviewRuns.length
      ? Math.max(
          ...data.reviewRuns.map((run) => new Date(run.createdAt).getTime())
        )
      : 0;
    return newestExtraction > newestReview;
  }, [data]);

  useEffect(() => {
    if (!(batchConfirmed && needsReview) || requestedReview.current) {
      return;
    }
    requestedReview.current = true;
    startReview();
  }, [batchConfirmed, needsReview, startReview]);

  /**
   * A draft and a final of the same payment application, not yet compared.
   *
   * Offered rather than run: a comparison is a chargeable call over two whole
   * documents, so the reviewer decides. A comparison answers which findings the
   * contractor fixed, so it is only worth offering once both documents have been
   * read and the findings on screen cover them both. Waiting for the extractions
   * also keeps the offer from competing with the confirmation checkpoint, where
   * the stages are still being corrected.
   */
  const comparisonSuggestion = useMemo(() => {
    if (
      !data ||
      needsReview ||
      data.reviewRuns.some((run) => ["queued", "running"].includes(run.status))
    ) {
      return null;
    }
    const extractionFor = (documentId: string) =>
      data.extractions.find(
        (extraction) => extraction.documentId === documentId
      );
    const payApplications = data.documents.filter(
      (document) =>
        document.status === "ready" &&
        document.category === "pay_application" &&
        ["completed", "needs_review"].includes(
          extractionFor(document.id)?.status ?? ""
        )
    );
    const drafts = payApplications.filter((d) => d.stage === "draft");
    const finals = payApplications.filter((d) => d.stage === "final");
    if (drafts.length !== 1 || finals.length !== 1) {
      return null;
    }
    const [draft] = drafts;
    const [final] = finals;
    const alreadyCompared = data.comparisons.some(
      (comparison) =>
        comparison.draftDocumentId === draft.id &&
        comparison.finalDocumentId === final.id
    );
    if (alreadyCompared) {
      return null;
    }
    const draftNumber = extractionFor(draft.id)?.data?.applicationNumber ?? null;
    const finalNumber = extractionFor(final.id)?.data?.applicationNumber ?? null;
    return {
      draft,
      final,
      applicationNumber:
        draftNumber && draftNumber === finalNumber ? draftNumber : null,
    };
  }, [data, needsReview]);

  const runComparison = useCallback(async () => {
    if (!comparisonSuggestion) {
      return;
    }
    try {
      await apiRequest(`/api/mayo/cases/${caseId}/comparisons`, {
        method: "POST",
        body: JSON.stringify({
          draftDocumentId: comparisonSuggestion.draft.id,
          finalDocumentId: comparisonSuggestion.final.id,
        }),
      });
      setActiveTab("comparison");
      await mutate();
    } catch (comparisonError) {
      toast.error(
        comparisonError instanceof Error
          ? comparisonError.message
          : "Unable to start the comparison"
      );
    }
  }, [caseId, comparisonSuggestion, mutate]);

  const deleteCase = useCallback(async () => {
    setDeletingCase(true);
    try {
      await apiRequest(`/api/mayo/cases/${caseId}`, { method: "DELETE" });
      toast.success("Case deleted");
      router.push("/mayo");
    } catch (deleteError) {
      setDeletingCase(false);
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete this case"
      );
    }
  }, [caseId, router]);

  const reviewAnyway = useCallback(() => {
    requestedReview.current = true;
    setFailedUploadNames([]);
    setFailedExtractionIds([]);
    startReview();
  }, [startReview]);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted-foreground">
        <LoaderIcon className="mr-2 animate-spin" />
        Loading Mayo case…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <AlertTriangleIcon className="mx-auto mb-3 size-7 text-destructive" />
          <h1 className="font-semibold">Unable to open this case</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Check your access or try again.
          </p>
          <Button asChild className="mt-5" variant="outline">
            <Link href="/mayo">Back to cases</Link>
          </Button>
        </div>
      </div>
    );
  }

  const latestRun = data.reviewRuns[0];
  const readyDocumentCount = data.documents.filter(
    (document) => document.status === "ready"
  ).length;
  const openFindingCount = data.findings.filter(
    (finding) => finding.status === "open"
  ).length;

  return (
    <main className="min-h-dvh bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild size="icon-sm" variant="ghost">
              <Link href="/mayo">
                <ArrowLeftIcon />
                <span className="sr-only">Back to Mayo cases</span>
              </Link>
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate font-semibold">{data.case.name}</h1>
                <Badge variant={statusBadgeVariant(data.case.status)}>
                  {data.case.status.replace("_", " ")}
                </Badge>
              </div>
              <p className="truncate text-muted-foreground text-xs">
                {data.case.projectName}
                {data.case.projectNumber ? ` · ${data.case.projectNumber}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingOperations ? (
              <span className="hidden items-center gap-1.5 text-muted-foreground text-xs sm:flex">
                <LoaderIcon className="size-3 animate-spin" />
                Processing
              </span>
            ) : null}
            {/* Offered whenever the findings are out of date with the
                documents. In the normal flow the pipeline has already done this
                and the button never appears; after a reload, or on a case
                reopened later, it is the way back in. */}
            {needsReview ? (
              <Button onClick={startReview} variant="outline">
                <PlayIcon />
                Run review
              </Button>
            ) : null}
            {data.membership.role === "owner" ? (
              <Button
                onClick={() => setConfirmingCaseDelete(true)}
                size="icon-sm"
                variant="ghost"
              >
                <Trash2Icon />
                <span className="sr-only">Delete this case</span>
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-6 px-5 py-6">
        {awaitingConfirmation ? (
          <ConfirmBatch
            caseId={caseId}
            documents={unconfirmedDocuments}
            mutate={mutate}
            onConfirm={() => setBatchConfirmed(true)}
          />
        ) : null}

        {comparisonSuggestion ? (
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4">
            <div className="min-w-0">
              <p className="font-medium text-sm">
                {comparisonSuggestion.applicationNumber
                  ? `Payment application ${comparisonSuggestion.applicationNumber} has a draft and a final.`
                  : "This case has a draft and a final of the same payment application."}
              </p>
              <p className="mt-1 text-muted-foreground text-sm">
                Comparing them shows which of the findings the contractor
                actually fixed.
              </p>
            </div>
            <Button onClick={runComparison} size="sm">
              <ScaleIcon />
              Compare them
            </Button>
          </section>
        ) : null}

        {batchState.failed && !batchState.working ? (
          <BatchNeedsAttention
            failedUploadNames={failedUploadNames}
            onReviewAnyway={reviewAnyway}
            onShowDocuments={() => setActiveTab("documents")}
          />
        ) : null}

        {pendingOperations ? (
          <PipelineProgress data={data} />
        ) : (
          <section className="grid gap-3 sm:grid-cols-3">
            <Metric
              label="Documents ready"
              value={`${readyDocumentCount}/${data.documents.length}`}
            />
            <Metric label="Open findings" value={String(openFindingCount)} />
            <Metric
              label="Latest review"
              value={latestRun?.status.replace("_", " ") ?? "Not run"}
            />
          </section>
        )}

        <nav className="flex flex-wrap items-center gap-1 rounded-xl border bg-muted/20 p-1">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                <Icon className="size-4" />
                {tab.label}
                {tab.id === "findings" && openFindingCount > 0 ? (
                  <Badge className="h-4 px-1.5" variant="destructive">
                    {openFindingCount}
                  </Badge>
                ) : null}
              </button>
            );
          })}

          <span className="mx-1 h-5 w-px shrink-0 bg-border" />

          {secondaryTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            if (!(showMore || active)) {
              return null;
            }
            return (
              <button
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            );
          })}

          <button
            className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground text-sm transition hover:text-foreground"
            onClick={() => setShowMore((current) => !current)}
            type="button"
          >
            {showMore ? "Less" : "More"}
          </button>
        </nav>

        {activeTab === "documents" ? (
          <DocumentsPanel
            canDelete={["owner", "admin"].includes(data.membership.role)}
            caseId={caseId}
            documents={data.documents}
            extractions={data.extractions}
            mutate={mutate}
            onDocumentsQueued={queueUploadedDocuments}
            onShowExtractions={() => setActiveTab("extractions")}
          />
        ) : null}
        {activeTab === "extractions" ? <ExtractionsPanel data={data} /> : null}
        {activeTab === "findings" ? (
          <FindingsPanel
            caseId={caseId}
            data={data}
            findings={data.findings}
            latestRun={latestRun}
            mutate={mutate}
          />
        ) : null}
        {activeTab === "comparison" ? (
          <ComparisonPanel caseId={caseId} data={data} mutate={mutate} />
        ) : null}
        {activeTab === "ebuilder" ? (
          <EbuilderPanel caseId={caseId} data={data} mutate={mutate} />
        ) : null}
        {activeTab === "rules" ? (
          <RulesPanel data={data} mutate={mutate} />
        ) : null}
        {activeTab === "audit" ? <AuditPanel data={data} /> : null}
      </div>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setConfirmingCaseDelete(false);
          }
        }}
        open={confirmingCaseDelete}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this case?</DialogTitle>
            <DialogDescription>
              This permanently removes {data.case.name}, its{" "}
              {data.documents.length} document
              {data.documents.length === 1 ? "" : "s"}, every finding, and the
              stored copies held for search. It cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button disabled={deletingCase} variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              disabled={deletingCase}
              onClick={deleteCase}
              variant="destructive"
            >
              {deletingCase ? <LoaderIcon className="animate-spin" /> : null}
              {deletingCase ? "Deleting…" : "Delete case"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-muted-foreground text-xs uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-2 font-mono font-semibold text-lg capitalize">{value}</p>
    </div>
  );
}

const DOCUMENT_TYPES: MayoDocumentCategory[] = [
  "contract",
  "amendment",
  "pay_application",
  "invoice",
  "change_order",
  "prior_payment",
  "supporting_document",
  "other",
];

/**
 * Type and submission for one document. Lives on the document card as well as
 * in the checkpoint, so a misclassification can always be corrected rather than
 * only during the moment the checkpoint happens to be on screen.
 */
function DocumentClassification({
  caseId,
  document,
  mutate,
}: {
  caseId: string;
  document: MayoClientDocument;
  mutate: KeyedMutator<MayoCaseSnapshot>;
}) {
  /**
   * The snapshot is updated before the request goes out, so the select, the badge
   * beside the filename and the comparison offer all move together. Waiting on the
   * round trip left the control saying one thing while the rest of the card still
   * said another.
   */
  function update(patch: {
    category?: MayoDocumentCategory;
    stage?: MayoDocumentStage;
  }) {
    mutate(
      (current) =>
        current && {
          ...current,
          documents: current.documents.map((existing) =>
            existing.id === document.id ? { ...existing, ...patch } : existing
          ),
        },
      { revalidate: false }
    );
    apiRequest(`/api/mayo/cases/${caseId}/documents/${document.id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    })
      .catch((updateError) => {
        toast.error(
          updateError instanceof Error
            ? updateError.message
            : "Unable to update this document"
        );
      })
      .finally(() => {
        mutate();
      });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Document type"
        className="h-8 rounded-lg border bg-background px-2 text-sm"
        onChange={(event) => {
          // The submission is only ever asked of a pay application, so it is
          // cleared along with the question rather than left behind as an answer
          // to something no longer being asked.
          const next = event.target.value as MayoDocumentCategory;
          update(
            next === "pay_application"
              ? { category: next }
              : { category: next, stage: "supporting" }
          );
        }}
        value={document.category}
      >
        {DOCUMENT_TYPES.map((type) => (
          <option key={type} value={type}>
            {type.replaceAll("_", " ")}
          </option>
        ))}
      </select>
      {/* Only a pay application can be compared against a resubmission, so
          nothing else is asked this question. */}
      {document.category === "pay_application" ? (
        <select
          aria-label="Which submission"
          className="h-8 rounded-lg border bg-background px-2 text-sm"
          onChange={(event) =>
            update({ stage: event.target.value as MayoDocumentStage })
          }
          value={document.stage}
        >
          <option value="supporting">Neither</option>
          <option value="draft">Draft</option>
          <option value="final">Final</option>
        </select>
      ) : null}
    </div>
  );
}

/**
 * The one checkpoint in the flow. Reading and classifying a document is cheap;
 * extracting every figure and reviewing the case is not. So the reviewer is
 * asked to confirm what these documents are at the only point where correcting
 * it costs nothing.
 */
function ConfirmBatch({
  caseId,
  documents,
  mutate,
  onConfirm,
}: {
  caseId: string;
  documents: MayoClientDocument[];
  mutate: KeyedMutator<MayoCaseSnapshot>;
  onConfirm: () => void;
}) {
  const ready = documents.filter((document) => document.status === "ready");

  return (
    <section className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium text-sm">
            Here is what Mayo found. Correct anything that looks wrong.
          </p>
          <p className="mt-1 text-muted-foreground text-sm">
            Nothing has been charged yet. The review starts when you say so.
          </p>
        </div>
        <Button onClick={onConfirm} size="sm">
          <PlayIcon />
          Looks right, start the review
        </Button>
      </div>

      <div className="mt-4 space-y-2">
        {ready.map((document) => (
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background p-3"
            key={document.id}
          >
            <p className="min-w-0 flex-1 truncate text-sm">
              {document.originalFilename}
            </p>
            <DocumentClassification
              caseId={caseId}
              document={document}
              mutate={mutate}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Shown when part of a batch did not come through. The review is a chargeable
 * call over the whole case, so it is deliberately not started automatically
 * here: the reviewer either completes the batch or accepts the gap.
 */
function BatchNeedsAttention({
  failedUploadNames,
  onReviewAnyway,
  onShowDocuments,
}: {
  failedUploadNames: string[];
  onReviewAnyway: () => void;
  onShowDocuments: () => void;
}) {
  return (
    <section className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium text-sm">
            Some documents did not come through
          </p>
          <p className="mt-1 text-muted-foreground text-sm">
            {failedUploadNames.length > 0
              ? `Could not add: ${failedUploadNames.join(", ")}. `
              : ""}
            The review has not started, so nothing has been charged yet. Add the
            missing documents to this batch, or review what is here and accept
            that those documents are not covered.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button onClick={onShowDocuments} size="sm" variant="outline">
            Add the missing documents
          </Button>
          <Button onClick={onReviewAnyway} size="sm">
            <PlayIcon />
            Review what is here
          </Button>
        </div>
      </div>
    </section>
  );
}

/** Progress line shown in place of the metric tiles while the pipeline runs. */
function PipelineProgress({ data }: { data: MayoCaseSnapshot }) {
  const reading = data.documents.filter((document) =>
    ["uploading", "uploaded", "indexing"].includes(document.status)
  ).length;
  const extracting = data.extractions.filter((extraction) =>
    ["pending", "processing"].includes(extraction.status)
  ).length;
  const reviewing = data.reviewRuns.some((run) =>
    ["queued", "running"].includes(run.status)
  );

  let message = "Working…";
  if (reading > 0) {
    message = `Reading ${reading} document${reading === 1 ? "" : "s"}…`;
  } else if (extracting > 0) {
    message = `Pulling out the figures from ${extracting} document${
      extracting === 1 ? "" : "s"
    }…`;
  } else if (reviewing) {
    message = "Checking the numbers against the rules…";
  }

  return (
    <section className="flex items-center gap-3 rounded-xl border bg-card p-4">
      <LoaderIcon className="size-4 shrink-0 animate-spin text-emerald-600" />
      <div className="min-w-0">
        <p className="font-medium text-sm">{message}</p>
        <p className="text-muted-foreground text-xs">
          This keeps going on its own. Findings appear when it finishes.
        </p>
      </div>
    </section>
  );
}

function DocumentsPanel({
  canDelete,
  caseId,
  documents,
  extractions,
  mutate,
  onDocumentsQueued,
  onShowExtractions,
}: {
  canDelete: boolean;
  caseId: string;
  documents: MayoClientDocument[];
  extractions: MayoCaseSnapshot["extractions"];
  mutate: KeyedMutator<MayoCaseSnapshot>;
  onDocumentsQueued: (documentIds: string[], failedNames: string[]) => void;
  onShowExtractions: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadingName, setUploadingName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [documentPendingDeletion, setDocumentPendingDeletion] =
    useState<MayoClientDocument | null>(null);

  async function uploadDocuments(event: React.FormEvent) {
    event.preventDefault();
    const files = Array.from(fileInputRef.current?.files ?? []);
    if (files.length === 0) {
      toast.error("Choose at least one document");
      return;
    }

    setUploading(true);
    const uploadedIds: string[] = [];
    const failed: string[] = [];

    // One rejected document must not discard the rest of the packet.
    for (const file of files) {
      setUploadingName(file.name);
      setProgress(0);
      try {
        const mimeType = inferMayoMimeType(file);
        const initiated = await apiRequest<{
          document: MayoClientDocument;
          uploadUrl: string;
        }>(`/api/mayo/cases/${caseId}/documents/uploads`, {
          method: "POST",
          body: JSON.stringify({
            filename: file.name,
            mimeType,
            sizeBytes: file.size,
            category: DEFAULT_UPLOAD_CATEGORY,
          }),
        });
        await uploadToResumableUrl({
          url: initiated.uploadUrl,
          file,
          mimeType,
          onProgress: setProgress,
        });
        await apiRequest(
          `/api/mayo/cases/${caseId}/documents/${initiated.document.id}/complete`,
          { method: "POST" }
        );
        uploadedIds.push(initiated.document.id);
      } catch {
        failed.push(file.name);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onDocumentsQueued(uploadedIds, failed);
    if (uploadedIds.length > 0) {
      toast.success(
        `${uploadedIds.length} document${
          uploadedIds.length === 1 ? "" : "s"
        } added. Reading them now.`
      );
    }
    if (failed.length > 0) {
      toast.error(
        `Could not add ${failed.length} document${
          failed.length === 1 ? "" : "s"
        }: ${failed.join(", ")}`
      );
    }
    await mutate();
    setUploading(false);
    setUploadingName("");
    setProgress(0);
  }

  async function documentAction(
    document: MayoClientDocument,
    action: "retry" | "extract" | "delete"
  ) {
    try {
      await apiRequest(
        `/api/mayo/cases/${caseId}/documents/${document.id}${
          action === "delete" ? "" : `/${action}`
        }`,
        { method: action === "delete" ? "DELETE" : "POST" }
      );
      toast.success(
        action === "extract"
          ? "Extraction queued"
          : action === "retry"
            ? "Indexing retry queued"
            : "Document deleted"
      );
      await mutate();
    } catch (actionError) {
      toast.error(
        actionError instanceof Error ? actionError.message : "Action failed"
      );
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <form
        className="h-fit space-y-5 rounded-2xl border bg-card p-5"
        onSubmit={uploadDocuments}
      >
        <div>
          <h2 className="font-semibold">Add documents</h2>
          <p className="mt-1 text-muted-foreground text-sm">
            Add the whole packet at once: the pay application, the contract,
            change orders and any backup. Mayo works out what each one is and
            reviews them for you.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="mayo-file">Documents</Label>
          <Input
            accept=".pdf,.doc,.docx,.pptx,.txt,.md,.json"
            id="mayo-file"
            multiple
            ref={fileInputRef}
            required
            type="file"
          />
        </div>
        {uploading ? (
          <div className="space-y-2">
            <div className="flex justify-between gap-3 text-xs">
              <span className="truncate">{uploadingName}</span>
              <span className="shrink-0">{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : null}
        <Button className="w-full" disabled={uploading} type="submit">
          {uploading ? (
            <LoaderIcon className="animate-spin" />
          ) : (
            <CloudUploadIcon />
          )}
          Add documents
        </Button>
      </form>

      <div className="space-y-3">
        {documents.length === 0 ? (
          <EmptyState
            icon={FileSearchIcon}
            text="Upload the contract, pay application, changes, and supporting documents to begin."
            title="No documents"
          />
        ) : null}
        {documents.map((document) => (
          <div
            className="flex flex-col justify-between gap-4 rounded-xl border bg-card p-4 md:flex-row md:items-center"
            key={document.id}
          >
            <div className="flex min-w-0 items-start gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
                <FileTextIcon className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">
                    {document.originalFilename}
                  </p>
                  <Badge variant={statusBadgeVariant(document.status)}>
                    {document.status}
                  </Badge>
                  {/* "supporting" is the default every document carries, so it
                      is only worth showing once it means something. */}
                  {document.stage === "supporting" ? null : (
                    <Badge variant="outline">{document.stage}</Badge>
                  )}
                </div>
                <p className="mt-1 text-muted-foreground text-xs">
                  {detectedDocumentCategory(document)?.replaceAll("_", " ") ??
                    "Working out what this is…"}{" "}
                  · {formatBytes(document.sizeBytes)}
                </p>
                {document.indexingError ? (
                  <p className="mt-1 text-destructive text-xs">
                    {document.indexingError}
                  </p>
                ) : null}
                {document.status === "ready" ? (
                  <div className="mt-2">
                    <DocumentClassification
                      caseId={caseId}
                      document={document}
                      mutate={mutate}
                    />
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {document.status === "ready" ? (
                <>
                  <Button asChild size="sm" variant="outline">
                    <a
                      href={`${basePath}/api/mayo/cases/${caseId}/documents/${document.id}/content`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open source
                    </a>
                  </Button>
                  {needsManualExtraction(document, extractions) ? (
                    <Button
                      onClick={() => documentAction(document, "extract")}
                      size="sm"
                      variant="outline"
                    >
                      {extractionFailed(document, extractions) ? (
                        <>
                          <RefreshCwIcon />
                          Try again
                        </>
                      ) : (
                        <>
                          <FileCheck2Icon />
                          Extract
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={onShowExtractions}
                      size="sm"
                      variant="outline"
                    >
                      <DatabaseIcon />
                      What Mayo read
                    </Button>
                  )}
                </>
              ) : null}
              {document.status === "failed" ? (
                <Button
                  onClick={() => documentAction(document, "retry")}
                  size="sm"
                  variant="outline"
                >
                  <RefreshCwIcon />
                  Retry
                </Button>
              ) : null}
              {canDelete ? (
                <Button
                  onClick={() => setDocumentPendingDeletion(document)}
                  size="icon-sm"
                  variant="ghost"
                >
                  <Trash2Icon />
                  <span className="sr-only">Delete document</span>
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setDocumentPendingDeletion(null);
          }
        }}
        open={Boolean(documentPendingDeletion)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete document?</DialogTitle>
            <DialogDescription>
              This permanently removes{" "}
              {documentPendingDeletion?.originalFilename ?? "the document"} from
              private GCS storage and its derived OpenAI copy.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              disabled={deleting}
              onClick={async () => {
                if (documentPendingDeletion) {
                  setDeleting(true);
                  await documentAction(documentPendingDeletion, "delete");
                  setDeleting(false);
                  setDocumentPendingDeletion(null);
                }
              }}
              variant="destructive"
            >
              {deleting ? <LoaderIcon className="animate-spin" /> : null}
              {deleting ? "Deleting…" : "Delete document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ExtractionsPanel({ data }: { data: MayoCaseSnapshot }) {
  if (data.extractions.length === 0) {
    return (
      <EmptyState
        icon={DatabaseIcon}
        text="Index a document, then choose Extract from the Documents tab."
        title="No structured extractions"
      />
    );
  }

  return (
    <section className="space-y-4">
      {data.extractions.map((extraction) => {
        const document = data.documents.find(
          (candidate) => candidate.id === extraction.documentId
        );
        const extracted = extraction.data;
        return (
          <article
            className="rounded-2xl border bg-card p-5"
            key={extraction.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">
                  {document?.originalFilename ?? "Document"}
                </h2>
                <p className="text-muted-foreground text-xs">
                  {extraction.model} · updated{" "}
                  {formatDate(extraction.updatedAt)}
                </p>
              </div>
              <Badge variant={statusBadgeVariant(extraction.status)}>
                {extraction.status.replace("_", " ")}
              </Badge>
            </div>
            {extraction.errorMessage ? (
              <p className="mt-4 text-destructive text-sm">
                {extraction.errorMessage}
              </p>
            ) : null}
            {extracted ? (
              <>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Fact label="Vendor" value={extracted.vendor ?? "—"} />
                  <Fact
                    label="Application"
                    value={
                      extracted.applicationNumber ??
                      extracted.invoiceNumber ??
                      "—"
                    }
                  />
                  <Fact
                    label="Current payment"
                    value={formatMoney(extracted.currentPayment)}
                  />
                  <Fact
                    label="Contract value"
                    value={formatMoney(extracted.contractValue)}
                  />
                  <Fact
                    label="Retainage"
                    value={formatMoney(extracted.retainageAmount)}
                  />
                  <Fact
                    label="Approved changes"
                    value={formatMoney(extracted.approvedChangeOrders)}
                  />
                  <Fact
                    label="Pending changes"
                    value={formatMoney(extracted.pendingChangeOrders)}
                  />
                  <Fact
                    label="Confidence"
                    value={`${Math.round(extracted.confidence * 100)}%`}
                  />
                </div>
                {extracted.missingFields.length > 0 ? (
                  <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                    <p className="font-medium text-sm">
                      Reviewer confirmation required
                    </p>
                    <p className="mt-1 text-muted-foreground text-sm">
                      Missing: {extracted.missingFields.join(", ")}
                    </p>
                  </div>
                ) : null}
                {extracted.reviewerNotes.length > 0 ? (
                  <div className="mt-5 space-y-2">
                    <h3 className="font-medium text-sm">Extraction notes</h3>
                    {extracted.reviewerNotes.map((note) => (
                      <MessageResponse
                        className="rounded-lg border bg-muted/20 p-3 text-sm"
                        key={note}
                      >
                        {note}
                      </MessageResponse>
                    ))}
                  </div>
                ) : null}
                {extracted.lineItems.length > 0 ? (
                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b text-muted-foreground text-xs">
                        <tr>
                          <th className="px-2 py-2">Line</th>
                          <th className="px-2 py-2">Description</th>
                          <th className="px-2 py-2 text-right">Scheduled</th>
                          <th className="px-2 py-2 text-right">Current</th>
                          <th className="px-2 py-2 text-right">Completed</th>
                          <th className="px-2 py-2 text-right">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {extracted.lineItems.map((line, index) => (
                          <tr
                            className="border-b border-border/50"
                            key={`${line.lineNumber}-${index}`}
                          >
                            <td className="px-2 py-2 font-mono">
                              {line.lineNumber ?? "—"}
                            </td>
                            <td className="max-w-md px-2 py-2">
                              {line.description}
                            </td>
                            <td className="px-2 py-2 text-right font-mono">
                              {formatMoney(line.scheduledValue)}
                            </td>
                            <td className="px-2 py-2 text-right font-mono">
                              {formatMoney(line.currentApplication)}
                            </td>
                            <td className="px-2 py-2 text-right font-mono">
                              {formatMoney(line.totalCompleted)}
                            </td>
                            <td className="px-2 py-2 text-right font-mono">
                              {formatMoney(line.balanceToFinish)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}

/**
 * The numbers behind a deterministic finding. Shown on the finding itself so the
 * reviewer can see what it was working from rather than taking the result on
 * trust. Semantic findings rely on their quoted evidence instead.
 */
function FindingInputs({
  finding,
  snapshot,
}: {
  finding: MayoClientFinding;
  snapshot: MayoCaseSnapshot;
}) {
  const rows = findingInputs(finding, snapshot);
  if (rows.length === 0) {
    return null;
  }
  return (
    <div className="mt-4 rounded-xl border bg-background p-4">
      <p className="font-medium text-xs uppercase tracking-wide">
        How this was worked out
      </p>
      <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {rows.map((row) => (
          <div className="flex justify-between gap-3 text-sm" key={row.label}>
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="font-mono">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function FindingsPanel({
  caseId,
  data,
  findings,
  latestRun,
  mutate,
}: {
  caseId: string;
  data: MayoCaseSnapshot;
  findings: MayoClientFinding[];
  latestRun: MayoCaseSnapshot["reviewRuns"][number] | undefined;
  mutate: () => Promise<unknown>;
}) {
  const [comments, setComments] = useState<Record<string, string>>({});
  const decidedCount = findings.filter(
    (finding) => finding.status !== "open"
  ).length;

  async function updateFinding(
    finding: MayoClientFinding,
    status: MayoClientFinding["status"]
  ) {
    try {
      await apiRequest(`/api/mayo/cases/${caseId}/findings/${finding.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          comment: comments[finding.id] || undefined,
        }),
      });
      setComments((current) => ({ ...current, [finding.id]: "" }));
      toast.success("Reviewer decision saved");
      await mutate();
    } catch (decisionError) {
      toast.error(
        decisionError instanceof Error
          ? decisionError.message
          : "Unable to save decision"
      );
    }
  }

  return (
    <section className="space-y-4">
      {latestRun ? (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium text-sm">
                {findings.length > 0
                  ? `${decidedCount} of ${findings.length} findings reviewed`
                  : "Latest review"}
              </p>
              <p className="text-muted-foreground text-xs">
                {formatDate(latestRun.createdAt)}
              </p>
            </div>
            <Badge variant={statusBadgeVariant(latestRun.status)}>
              {latestRun.status.replace("_", " ")}
            </Badge>
          </div>
          {latestRun.summary ? (
            <MessageResponse className="mt-3 text-sm">
              {latestRun.summary}
            </MessageResponse>
          ) : null}
          {latestRun.errorMessage ? (
            <p className="mt-3 text-destructive text-sm">
              {latestRun.errorMessage}
            </p>
          ) : null}
        </div>
      ) : null}

      {findings.length === 0 ? (
        <EmptyState
          icon={ShieldCheckIcon}
          text="Run a review after documents finish indexing. Human decisions remain mandatory."
          title="No findings"
        />
      ) : null}

      {findings.map((finding) => (
        <article
          className={cn(
            "rounded-2xl border bg-card p-5",
            finding.severity === "critical" && "border-destructive/40",
            finding.severity === "high" && "border-orange-500/40"
          )}
          key={finding.id}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusBadgeVariant(finding.severity)}>
                  {finding.severity}
                </Badge>
                <Badge variant="outline">
                  {data.rules.find((rule) => rule.code === finding.ruleCode)
                    ?.name ?? finding.ruleCode}
                </Badge>
                <Badge variant={statusBadgeVariant(finding.status)}>
                  {finding.status}
                </Badge>
              </div>
              <h2 className="font-semibold text-lg">{finding.title}</h2>
            </div>
            <div className="text-right">
              <p className="font-mono font-semibold">
                {formatMoney(finding.amountImpact)}
              </p>
              <p className="text-muted-foreground text-xs">
                {finding.confidence}% confidence · {finding.source}
              </p>
            </div>
          </div>
          <MessageResponse className="mt-4 text-sm">
            {finding.description}
          </MessageResponse>
          <FindingInputs finding={finding} snapshot={data} />

          <div className="mt-4 rounded-xl bg-muted/30 p-4">
            <p className="font-medium text-xs uppercase tracking-wide">
              Recommendation
            </p>
            <MessageResponse className="mt-2 text-sm">
              {finding.recommendation}
            </MessageResponse>
          </div>
          <div className="mt-4 space-y-2">
            <h3 className="font-medium text-sm">Evidence</h3>
            {finding.evidence.map((evidence) => (
              <blockquote
                className="rounded-lg border-l-2 border-emerald-500 bg-muted/20 px-4 py-3 text-sm"
                key={evidence.id}
              >
                <p>{evidence.excerpt}</p>
                <footer className="mt-2 text-muted-foreground text-xs">
                  {evidence.filename}
                  {evidence.pageNumber
                    ? ` · page ${evidence.pageNumber} (unverified)`
                    : ""}
                  {evidence.documentId ? (
                    <>
                      {" · "}
                      <a
                        className="text-emerald-600 hover:underline"
                        href={`${basePath}/api/mayo/cases/${caseId}/documents/${evidence.documentId}/content`}
                        rel="noreferrer"
                        target="_blank"
                      >
                        open source
                      </a>
                    </>
                  ) : null}
                </footer>
              </blockquote>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            <Textarea
              onChange={(event) =>
                setComments((current) => ({
                  ...current,
                  [finding.id]: event.target.value,
                }))
              }
              placeholder="Optional reviewer comment"
              value={comments[finding.id] ?? ""}
            />
            <div className="flex flex-wrap gap-2">
              {/* Same three stored statuses, named for what the reviewer is
                  actually deciding rather than for the state machine. */}
              <Button
                onClick={() => updateFinding(finding, "accepted")}
                size="sm"
                variant="outline"
              >
                <CheckCircle2Icon />
                Agree, raise with contractor
              </Button>
              <Button
                onClick={() => updateFinding(finding, "rejected")}
                size="sm"
                variant="outline"
              >
                <XCircleIcon />
                Not an issue
              </Button>
              <Button
                onClick={() => updateFinding(finding, "resolved")}
                size="sm"
                variant="outline"
              >
                <ShieldCheckIcon />
                Already dealt with
              </Button>
              {finding.status !== "open" ? (
                <Button
                  onClick={() => updateFinding(finding, "open")}
                  size="sm"
                  variant="ghost"
                >
                  Reopen
                </Button>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function ComparisonPanel({
  caseId,
  data,
  mutate,
}: {
  caseId: string;
  data: MayoCaseSnapshot;
  mutate: () => Promise<unknown>;
}) {
  // Only pay applications are asked which submission they are, so a document of
  // any other type is carrying a leftover answer and is not half of a pair.
  const comparable = data.documents.filter(
    (document) =>
      document.status === "ready" && document.category === "pay_application"
  );
  const drafts = comparable.filter((document) => document.stage === "draft");
  const finals = comparable.filter((document) => document.stage === "final");
  const [draftDocumentId, setDraftDocumentId] = useState("");
  const [finalDocumentId, setFinalDocumentId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function compare(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest(`/api/mayo/cases/${caseId}/comparisons`, {
        method: "POST",
        body: JSON.stringify({ draftDocumentId, finalDocumentId }),
      });
      toast.success("Draft/final comparison queued");
      await mutate();
    } catch (comparisonError) {
      toast.error(
        comparisonError instanceof Error
          ? comparisonError.message
          : "Unable to start comparison"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-5">
      <form
        className="grid gap-4 rounded-2xl border bg-card p-5 md:grid-cols-[1fr_1fr_auto]"
        onSubmit={compare}
      >
        <div className="space-y-2">
          <Label htmlFor="mayo-draft">Draft document</Label>
          <select
            className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
            id="mayo-draft"
            onChange={(event) => setDraftDocumentId(event.target.value)}
            required
            value={draftDocumentId}
          >
            <option value="">Select indexed draft</option>
            {drafts.map((document) => (
              <option key={document.id} value={document.id}>
                {document.originalFilename}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="mayo-final">Final document</Label>
          <select
            className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
            id="mayo-final"
            onChange={(event) => setFinalDocumentId(event.target.value)}
            required
            value={finalDocumentId}
          >
            <option value="">Select indexed final</option>
            {finals.map((document) => (
              <option key={document.id} value={document.id}>
                {document.originalFilename}
              </option>
            ))}
          </select>
        </div>
        <Button
          className="self-end"
          disabled={submitting || !draftDocumentId || !finalDocumentId}
          type="submit"
        >
          {submitting ? <LoaderIcon className="animate-spin" /> : <ScaleIcon />}
          Compare
        </Button>
      </form>

      {data.comparisons.length === 0 ? (
        <EmptyState
          icon={ScaleIcon}
          text="Mark uploaded documents as draft and final to compare the reviewed submission."
          title="No comparisons"
        />
      ) : null}
      {data.comparisons.map((comparison) => (
        <article className="rounded-2xl border bg-card p-5" key={comparison.id}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Draft/final comparison</h2>
              <p className="text-muted-foreground text-xs">
                {formatDate(comparison.createdAt)}
              </p>
            </div>
            <Badge variant={statusBadgeVariant(comparison.status)}>
              {comparison.status}
            </Badge>
          </div>
          {comparison.summary ? (
            <MessageResponse className="mt-4 text-sm">
              {comparison.summary}
            </MessageResponse>
          ) : null}
          {comparison.data ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Fact
                label="Resolved"
                value={String(
                  comparison.data.resolvedFindingFingerprints.length
                )}
              />
              <Fact
                label="Unchanged"
                value={String(
                  comparison.data.unchangedFindingFingerprints.length
                )}
              />
              <Fact
                label="New"
                value={String(comparison.data.newFindings.length)}
              />
            </div>
          ) : null}
          {comparison.errorMessage ? (
            <p className="mt-4 text-destructive text-sm">
              {comparison.errorMessage}
            </p>
          ) : null}
        </article>
      ))}
    </section>
  );
}

function EbuilderPanel({
  caseId,
  data,
  mutate,
}: {
  caseId: string;
  data: MayoCaseSnapshot;
  mutate: () => Promise<unknown>;
}) {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [projectSearchTerm, setProjectSearchTerm] = useState(
    data.case.projectNumber ?? data.case.projectName
  );
  const [submitting, setSubmitting] = useState(false);

  async function sync(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest(`/api/mayo/cases/${caseId}/ebuilder-sync`, {
        method: "POST",
        body: JSON.stringify({ invoiceNumber, projectSearchTerm }),
      });
      toast.success("eBuilder evidence import queued");
      await mutate();
    } catch (syncError) {
      toast.error(
        syncError instanceof Error
          ? syncError.message
          : "Unable to start eBuilder import"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <form
        className="h-fit space-y-4 rounded-2xl border bg-card p-5"
        onSubmit={sync}
      >
        <div>
          <h2 className="font-semibold">Import eBuilder evidence</h2>
          <p className="mt-1 text-muted-foreground text-sm">
            Calls the configured MCP evidence-pack tool, stores the result in
            GCS, and indexes it into this case.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ebuilder-invoice-number">Invoice number</Label>
          <Input
            id="ebuilder-invoice-number"
            onChange={(event) => setInvoiceNumber(event.target.value)}
            required
            value={invoiceNumber}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ebuilder-project">Project search</Label>
          <Input
            id="ebuilder-project"
            onChange={(event) => setProjectSearchTerm(event.target.value)}
            value={projectSearchTerm}
          />
        </div>
        <Button className="w-full" disabled={submitting} type="submit">
          {submitting ? (
            <LoaderIcon className="animate-spin" />
          ) : (
            <RefreshCwIcon />
          )}
          Import evidence pack
        </Button>
      </form>
      <div className="space-y-3">
        {data.integrationSyncs.length === 0 ? (
          <EmptyState
            icon={RefreshCwIcon}
            text="Connect an eBuilder MCP server in Settings, then import an invoice evidence pack."
            title="No eBuilder imports"
          />
        ) : null}
        {data.integrationSyncs.map((syncRecord) => (
          <div className="rounded-xl border bg-card p-4" key={syncRecord.id}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">eBuilder evidence import</p>
                <p className="text-muted-foreground text-xs">
                  {formatDate(syncRecord.createdAt)}
                </p>
              </div>
              <Badge variant={statusBadgeVariant(syncRecord.status)}>
                {syncRecord.status}
              </Badge>
            </div>
            {syncRecord.errorMessage ? (
              <p className="mt-3 text-destructive text-sm">
                {syncRecord.errorMessage}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function RulesPanel({
  data,
  mutate,
}: {
  data: MayoCaseSnapshot;
  mutate: () => Promise<unknown>;
}) {
  const [familyCode, setFamilyCode] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [familyId, setFamilyId] = useState(data.ruleFamilies[0]?.id ?? "");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<"deterministic" | "semantic">("semantic");
  const [severity, setSeverity] = useState<
    "info" | "low" | "medium" | "high" | "critical"
  >("medium");

  async function createFamily(event: React.FormEvent) {
    event.preventDefault();
    try {
      await apiRequest("/api/mayo/rule-families", {
        method: "POST",
        body: JSON.stringify({
          caseId: data.case.id,
          code: familyCode.toUpperCase().replace(/\W+/g, "_"),
          name: familyName,
        }),
      });
      setFamilyCode("");
      setFamilyName("");
      toast.success("Rule family created");
      await mutate();
    } catch (ruleError) {
      toast.error(
        ruleError instanceof Error
          ? ruleError.message
          : "Unable to create family"
      );
    }
  }

  async function createRule(event: React.FormEvent) {
    event.preventDefault();
    try {
      await apiRequest("/api/mayo/rules", {
        method: "POST",
        body: JSON.stringify({
          caseId: data.case.id,
          familyId,
          code: code.toUpperCase().replace(/\W+/g, "_"),
          name,
          description,
          kind,
          severity,
          enabled: true,
          config: {},
        }),
      });
      setCode("");
      setName("");
      setDescription("");
      toast.success("Rule version created");
      await mutate();
    } catch (ruleError) {
      toast.error(
        ruleError instanceof Error ? ruleError.message : "Unable to create rule"
      );
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <div className="space-y-5">
        <form
          className="space-y-3 rounded-2xl border bg-card p-5"
          onSubmit={createFamily}
        >
          <h2 className="font-semibold">New rule family</h2>
          <Input
            onChange={(event) => setFamilyCode(event.target.value)}
            placeholder="COST_CONTROL"
            required
            value={familyCode}
          />
          <Input
            onChange={(event) => setFamilyName(event.target.value)}
            placeholder="Cost control"
            required
            value={familyName}
          />
          <Button className="w-full" type="submit" variant="outline">
            Create family
          </Button>
        </form>
        <form
          className="space-y-3 rounded-2xl border bg-card p-5"
          onSubmit={createRule}
        >
          <h2 className="font-semibold">New rule version</h2>
          <select
            className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
            onChange={(event) => setFamilyId(event.target.value)}
            required
            value={familyId}
          >
            {data.ruleFamilies.map((family) => (
              <option key={family.id} value={family.id}>
                {family.name}
              </option>
            ))}
          </select>
          <Input
            onChange={(event) => setCode(event.target.value)}
            placeholder="RULE_CODE"
            required
            value={code}
          />
          <Input
            onChange={(event) => setName(event.target.value)}
            placeholder="Rule name"
            required
            value={name}
          />
          <Textarea
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What the rule evaluates"
            required
            value={description}
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              className="h-9 rounded-lg border bg-background px-3 text-sm"
              onChange={(event) =>
                setKind(event.target.value as "deterministic" | "semantic")
              }
              value={kind}
            >
              <option value="semantic">Semantic</option>
              <option value="deterministic">Deterministic</option>
            </select>
            <select
              className="h-9 rounded-lg border bg-background px-3 text-sm"
              onChange={(event) =>
                setSeverity(
                  event.target.value as
                    | "info"
                    | "low"
                    | "medium"
                    | "high"
                    | "critical"
                )
              }
              value={severity}
            >
              <option value="info">Info</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <Button className="w-full" type="submit">
            Create rule
          </Button>
        </form>
      </div>

      <div className="space-y-3">
        {data.rules.map((rule) => (
          <div className="rounded-xl border bg-card p-4" key={rule.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{rule.code}</Badge>
                  <Badge variant={statusBadgeVariant(rule.severity)}>
                    {rule.severity}
                  </Badge>
                  <Badge variant="secondary">{rule.kind}</Badge>
                </div>
                <h3 className="mt-2 font-medium">{rule.name}</h3>
                <p className="mt-1 text-muted-foreground text-sm">
                  {rule.description}
                </p>
              </div>
              <span className="font-mono text-muted-foreground text-xs">
                v{rule.version}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AuditPanel({ data }: { data: MayoCaseSnapshot }) {
  return (
    <section className="rounded-2xl border bg-card">
      <div className="border-b p-5">
        <h2 className="font-semibold">Immutable case activity</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          Uploads, model runs, rule versions, reviewer decisions, comparisons,
          and external synchronization.
        </p>
      </div>
      <div className="divide-y">
        {data.auditEvents.map((event) => (
          <div className="flex items-start gap-3 p-4" key={event.id}>
            <div className="mt-0.5 rounded-full bg-muted p-1.5">
              <ClockIcon className="size-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-sm">
                  {event.eventType.replaceAll(".", " · ").replaceAll("_", " ")}
                </p>
                <time className="font-mono text-muted-foreground text-xs">
                  {formatDate(event.createdAt)}
                </time>
              </div>
              <p className="mt-1 text-muted-foreground text-xs">
                {event.entityType}
                {event.entityId ? ` · ${event.entityId}` : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 truncate font-mono font-medium text-sm">{value}</p>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed p-10 text-center">
      <Icon className="mx-auto mb-3 size-7 text-muted-foreground" />
      <h2 className="font-medium">{title}</h2>
      <p className="mx-auto mt-1 max-w-lg text-muted-foreground text-sm">
        {text}
      </p>
    </div>
  );
}
