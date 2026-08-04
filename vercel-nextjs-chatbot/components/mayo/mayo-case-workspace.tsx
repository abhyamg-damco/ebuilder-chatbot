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
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
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

type WorkspaceTab =
  | "documents"
  | "extractions"
  | "findings"
  | "comparison"
  | "ebuilder"
  | "rules"
  | "audit";

const tabs: Array<{
  id: WorkspaceTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "documents", label: "Documents", icon: FileTextIcon },
  { id: "extractions", label: "Extractions", icon: DatabaseIcon },
  { id: "findings", label: "Findings", icon: ShieldCheckIcon },
  { id: "comparison", label: "Final comparison", icon: ScaleIcon },
  { id: "ebuilder", label: "eBuilder", icon: RefreshCwIcon },
  { id: "rules", label: "Rules", icon: Settings2Icon },
  { id: "audit", label: "Audit", icon: ScrollTextIcon },
];

const categories: Array<{ value: MayoDocumentCategory; label: string }> = [
  { value: "contract", label: "Contract" },
  { value: "amendment", label: "Amendment" },
  { value: "pay_application", label: "Pay application" },
  { value: "invoice", label: "Invoice" },
  { value: "change_order", label: "Change order" },
  { value: "prior_payment", label: "Prior payment" },
  { value: "supporting_document", label: "Supporting document" },
  { value: "other", label: "Other" },
];

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
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("documents");
  const { data, error, isLoading, mutate } = useSWR<MayoCaseSnapshot>(
    `${basePath}/api/mayo/cases/${caseId}`,
    fetcher,
    { refreshInterval: 3000 }
  );
  const pendingOperations = useMemo(
    () =>
      Boolean(
        data?.documents.some((document) =>
          ["uploading", "uploaded", "indexing"].includes(document.status)
        ) ||
          data?.extractions.some((extraction) =>
            ["pending", "processing"].includes(extraction.status)
          ) ||
          data?.reviewRuns.some((run) =>
            ["queued", "running"].includes(run.status)
          ) ||
          data?.comparisons.some((comparison) =>
            ["queued", "running"].includes(comparison.status)
          ) ||
          data?.integrationSyncs.some((sync) =>
            ["queued", "running"].includes(sync.status)
          )
      ),
    [data]
  );

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

  async function startReview() {
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
  }

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
            <Button disabled={readyDocumentCount === 0} onClick={startReview}>
              <PlayIcon />
              Run review
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-6 px-5 py-6">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Indexed documents"
            value={`${readyDocumentCount}/${data.documents.length}`}
          />
          <Metric label="Open findings" value={String(openFindingCount)} />
          <Metric
            label="Latest review"
            value={latestRun?.status.replace("_", " ") ?? "Not run"}
          />
          <Metric
            label="OpenAI knowledge base"
            value={data.case.openaiVectorStoreId ? "Ready" : "Not created"}
          />
        </section>

        <nav className="flex gap-1 overflow-x-auto rounded-xl border bg-muted/20 p-1">
          {tabs.map((tab) => {
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
        </nav>

        {activeTab === "documents" ? (
          <DocumentsPanel
            canDelete={["owner", "admin"].includes(data.membership.role)}
            caseId={caseId}
            documents={data.documents}
            mutate={mutate}
          />
        ) : null}
        {activeTab === "extractions" ? <ExtractionsPanel data={data} /> : null}
        {activeTab === "findings" ? (
          <FindingsPanel
            caseId={caseId}
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

function DocumentsPanel({
  canDelete,
  caseId,
  documents,
  mutate,
}: {
  canDelete: boolean;
  caseId: string;
  documents: MayoClientDocument[];
  mutate: () => Promise<unknown>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] =
    useState<MayoDocumentCategory>("pay_application");
  const [stage, setStage] = useState<MayoDocumentStage>("supporting");
  const [paymentApplicationNumber, setPaymentApplicationNumber] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [documentPendingDeletion, setDocumentPendingDeletion] =
    useState<MayoClientDocument | null>(null);

  async function uploadDocument(event: React.FormEvent) {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose a document");
      return;
    }

    setUploading(true);
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
          category,
          stage,
          revision: 1,
          paymentApplicationNumber: paymentApplicationNumber || undefined,
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
      toast.success("Upload complete; OpenAI indexing started");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setPaymentApplicationNumber("");
      await mutate();
    } catch (uploadError) {
      toast.error(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload document"
      );
    } finally {
      setUploading(false);
      setProgress(0);
    }
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
        onSubmit={uploadDocument}
      >
        <div>
          <h2 className="font-semibold">Add evidence</h2>
          <p className="mt-1 text-muted-foreground text-sm">
            Files remain private in GCS and are copied into this case&apos;s
            OpenAI vector store.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="mayo-file">Document</Label>
          <Input
            accept=".pdf,.doc,.docx,.pptx,.txt,.md,.json"
            id="mayo-file"
            ref={fileInputRef}
            required
            type="file"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mayo-category">Category</Label>
          <select
            className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
            id="mayo-category"
            onChange={(event) =>
              setCategory(event.target.value as MayoDocumentCategory)
            }
            value={category}
          >
            {categories.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="mayo-stage">Stage</Label>
          <select
            className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
            id="mayo-stage"
            onChange={(event) =>
              setStage(event.target.value as MayoDocumentStage)
            }
            value={stage}
          >
            <option value="supporting">Supporting</option>
            <option value="draft">Draft</option>
            <option value="final">Final</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="mayo-pay-app-number">Pay application number</Label>
          <Input
            id="mayo-pay-app-number"
            onChange={(event) =>
              setPaymentApplicationNumber(event.target.value)
            }
            placeholder="Optional"
            value={paymentApplicationNumber}
          />
        </div>
        {uploading ? (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Uploading to GCS</span>
              <span>{progress}%</span>
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
          Upload evidence
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
                  <Badge variant="outline">{document.stage}</Badge>
                </div>
                <p className="mt-1 text-muted-foreground text-xs">
                  {document.category.replaceAll("_", " ")} ·{" "}
                  {formatBytes(document.sizeBytes)} · revision{" "}
                  {document.revision}
                </p>
                {document.indexingError ? (
                  <p className="mt-1 text-destructive text-xs">
                    {document.indexingError}
                  </p>
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
                  <Button
                    onClick={() => documentAction(document, "extract")}
                    size="sm"
                  >
                    <FileCheck2Icon />
                    Extract
                  </Button>
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
              onClick={async () => {
                if (documentPendingDeletion) {
                  await documentAction(documentPendingDeletion, "delete");
                  setDocumentPendingDeletion(null);
                }
              }}
              variant="destructive"
            >
              Delete document
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

function FindingsPanel({
  caseId,
  findings,
  latestRun,
  mutate,
}: {
  caseId: string;
  findings: MayoClientFinding[];
  latestRun: MayoCaseSnapshot["reviewRuns"][number] | undefined;
  mutate: () => Promise<unknown>;
}) {
  const [comments, setComments] = useState<Record<string, string>>({});

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
              <p className="font-medium text-sm">Latest review</p>
              <p className="text-muted-foreground text-xs">
                {latestRun.model} · {formatDate(latestRun.createdAt)}
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
                <Badge variant="outline">{finding.ruleCode}</Badge>
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
              <Button
                onClick={() => updateFinding(finding, "accepted")}
                size="sm"
                variant="outline"
              >
                <CheckCircle2Icon />
                Accept finding
              </Button>
              <Button
                onClick={() => updateFinding(finding, "rejected")}
                size="sm"
                variant="outline"
              >
                <XCircleIcon />
                Reject finding
              </Button>
              <Button
                onClick={() => updateFinding(finding, "resolved")}
                size="sm"
                variant="outline"
              >
                <ShieldCheckIcon />
                Mark resolved
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
  const drafts = data.documents.filter(
    (document) => document.stage === "draft" && document.status === "ready"
  );
  const finals = data.documents.filter(
    (document) => document.stage === "final" && document.status === "ready"
  );
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
