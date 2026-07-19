"use client";

import { CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { Artifact } from "@/components/chat/create-artifact";
import type { AdvisoryBriefContent } from "@/lib/invoice-review/types";

type Metadata = Record<string, never>;

function parseBrief(content: string): AdvisoryBriefContent | null {
  try {
    return JSON.parse(content) as AdvisoryBriefContent;
  } catch {
    return null;
  }
}

function riskBadgeClass(risk?: string): string {
  switch (risk) {
    case "HIGH":
      return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200";
    case "MEDIUM":
      return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200";
    default:
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
  }
}

function severityClass(severity: string): string {
  switch (severity) {
    case "HIGH":
      return "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40";
    case "MED":
      return "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40";
    default:
      return "border-border bg-muted/40";
  }
}

export function BriefView({ content }: { content: string }) {
  const brief = parseBrief(content);

  if (!brief) {
    return (
      <pre className="overflow-auto p-4 font-mono text-xs leading-relaxed">
        {content}
      </pre>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 font-medium text-xs uppercase ${riskBadgeClass(brief.riskRating)}`}
        >
          {brief.riskRating} risk
        </span>
        {brief.invoiceNumber ? (
          <span className="text-muted-foreground text-xs">
            Invoice #{brief.invoiceNumber}
          </span>
        ) : null}
        {brief.vendor ? (
          <span className="text-muted-foreground text-xs">{brief.vendor}</span>
        ) : null}
      </div>

      {brief.contractSummary ? (
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/60 p-3 text-xs sm:grid-cols-4">
          <div>
            <div className="text-muted-foreground">Contract</div>
            <div className="font-medium">
              ${brief.contractSummary.contractValue.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Approved COs</div>
            <div className="font-medium">
              ${brief.contractSummary.approvedCos.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Billed to date</div>
            <div className="font-medium">
              ${brief.contractSummary.billedToDate.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Retainage held</div>
            <div className="font-medium">
              ${brief.contractSummary.retainageHeld.toLocaleString()}
            </div>
          </div>
        </div>
      ) : null}

      {brief.flags.length > 0 ? (
        <section className="space-y-2">
          <h3 className="font-semibold text-sm">Flags</h3>
          {brief.flags.map((flag) => (
            <div
              className={`rounded-lg border p-3 ${severityClass(flag.severity)}`}
              key={`${flag.code}-${flag.message}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-xs uppercase">
                  {flag.severity} · {flag.code}
                </span>
                {flag.amountUsd > 0 ? (
                  <span className="font-mono text-xs">
                    ${flag.amountUsd.toLocaleString()}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 leading-relaxed">{flag.message}</p>
              {flag.citations.length > 0 ? (
                <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                  {flag.citations.join(" · ")}
                </p>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      {brief.passedChecks.length > 0 ? (
        <section className="space-y-2">
          <h3 className="font-semibold text-sm">Passed</h3>
          <ul className="space-y-1 text-muted-foreground text-xs">
            {brief.passedChecks.map((item) => (
              <li key={`${item.code}-${item.message}`}>
                ✓ {item.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {brief.recommendation ? (
        <section className="rounded-lg border border-emerald-300/60 bg-emerald-50/60 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
          <h3 className="font-semibold text-sm">Recommendation</h3>
          <p className="mt-1 leading-relaxed">{brief.recommendation}</p>
        </section>
      ) : null}
    </div>
  );
}

export const advisoryBriefArtifact = new Artifact<"advisory-brief", Metadata>({
  kind: "advisory-brief",
  description: "Invoice review advisory brief with flags and citations",
  initialize: () => null,
  onStreamPart: ({ setArtifact, streamPart }) => {
    if (streamPart.type === "data-advisoryBriefDelta") {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.data,
        isVisible: true,
        status: "streaming",
      }));
    }
  },
  content: ({ content }) => <BriefView content={content} />,
  toolbar: [],
  actions: [
    {
      icon: <CopyIcon className="size-4" />,
      description: "Copy brief JSON",
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success("Copied advisory brief");
      },
    },
  ],
});
