"use client";

import { DownloadIcon, ExternalLinkIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { FilePreviewContent } from "@/lib/insights/types";

type FilePreviewViewProps = {
  preview: FilePreviewContent;
  compact?: boolean;
};

type PreviewProbeState = "loading" | "ready" | "failed";

function isImageContentType(contentType?: string): boolean {
  if (!contentType) {
    return false;
  }
  return contentType.startsWith("image/");
}

function resolveFileName(preview: FilePreviewContent): string {
  return (
    preview.metadata?.fileName ??
    preview.metadata?.filename ??
    preview.title ??
    ""
  );
}

function resolveFileId(preview: FilePreviewContent): string | undefined {
  if (preview.fileId && preview.fileId.length > 0) {
    return preview.fileId;
  }
  const fileId = preview.metadata?.fileId;
  return fileId && fileId.length > 0 ? fileId : undefined;
}

/** True when fileUrl is a real https download link (not a prompt placeholder). */
function isUsableDownloadUrl(url?: string): boolean {
  return Boolean(url?.startsWith("https://") && !url.includes("..."));
}

/** Inline preview via authenticated render proxy (supports PDF, images, Word). */
function resolveRenderUrl(preview: FilePreviewContent): string | undefined {
  const fileId = resolveFileId(preview);
  if (!fileId) {
    return undefined;
  }
  return `/api/documents/render?fileId=${encodeURIComponent(fileId)}`;
}

/** Download/open href: signed S3 URL preferred, else preview API redirect by fileId. */
function resolveDownloadHref(preview: FilePreviewContent): string | undefined {
  if (isUsableDownloadUrl(preview.fileUrl)) {
    return preview.fileUrl;
  }
  const fileId = resolveFileId(preview);
  if (fileId) {
    return `/api/documents/preview?fileId=${encodeURIComponent(fileId)}`;
  }
  return undefined;
}

function inferPreviewable(preview: FilePreviewContent): boolean {
  if (preview.previewable === false && !resolveRenderUrl(preview)) {
    return false;
  }

  if (resolveRenderUrl(preview)) {
    return true;
  }

  if (preview.previewable === true) {
    return true;
  }

  const contentType = preview.contentType?.toLowerCase() ?? "";
  if (contentType.includes("pdf") || contentType.startsWith("image/")) {
    return true;
  }

  const extension = resolveFileName(preview).split(".").pop()?.toLowerCase() ?? "";
  return ["pdf", "png", "jpg", "jpeg", "gif", "webp", "doc", "docx"].includes(
    extension
  );
}

function resolveDirectInlineSource(preview: FilePreviewContent): string | undefined {
  if (resolveRenderUrl(preview)) {
    return undefined;
  }
  if (isUsableDownloadUrl(preview.fileUrl) && inferPreviewable(preview)) {
    return preview.fileUrl;
  }
  return undefined;
}

type DocumentPreviewFrameProps = {
  preview: FilePreviewContent;
  compact: boolean;
  renderUrl: string;
  downloadHref?: string;
};

/** Probes render endpoint before showing iframe to avoid raw JSON errors. */
function DocumentPreviewFrame({
  preview,
  compact,
  renderUrl,
  downloadHref,
}: DocumentPreviewFrameProps) {
  const [probeState, setProbeState] = useState<PreviewProbeState>("loading");
  const height = compact ? 240 : 480;
  const isImage =
    isImageContentType(preview.contentType) &&
    !resolveFileName(preview).toLowerCase().endsWith(".docx") &&
    !resolveFileName(preview).toLowerCase().endsWith(".doc");

  useEffect(() => {
    let cancelled = false;

    async function probeRenderEndpoint() {
      setProbeState("loading");
      try {
        const response = await fetch(renderUrl, { credentials: "include" });
        if (!cancelled) {
          setProbeState(response.ok ? "ready" : "failed");
        }
      } catch {
        if (!cancelled) {
          setProbeState("failed");
        }
      }
    }

    probeRenderEndpoint();

    return () => {
      cancelled = true;
    };
  }, [renderUrl]);

  if (probeState === "loading") {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-border/60 bg-muted/20 text-muted-foreground text-sm"
        style={{ height }}
      >
        Loading preview…
      </div>
    );
  }

  if (probeState === "failed") {
    return (
      <DownloadFallback
        downloadHref={downloadHref}
        message="Inline preview is unavailable for this document."
        title={preview.title}
      />
    );
  }

  return (
    <div
      className="overflow-hidden rounded-lg border border-border/60 bg-muted/20"
      style={{ height }}
    >
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- proxied or signed URLs
        <img
          alt={preview.title}
          className="size-full object-contain"
          src={renderUrl}
        />
      ) : (
        <iframe
          className="size-full border-0 bg-white"
          src={renderUrl}
          title={preview.title}
        />
      )}
    </div>
  );
}

type DownloadFallbackProps = {
  title: string;
  message: string;
  downloadHref?: string;
};

function DownloadFallback({
  title,
  message,
  downloadHref,
}: DownloadFallbackProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-border/60 bg-muted/20 p-6 text-center">
      <p className="text-muted-foreground text-sm">{message}</p>
      {downloadHref ? (
        <a
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm hover:opacity-90"
          download={title}
          href={downloadHref}
          rel="noopener noreferrer"
          target="_blank"
        >
          <DownloadIcon className="size-4" />
          Download document
        </a>
      ) : (
        <p className="text-muted-foreground text-xs">
          Ask the assistant to fetch the document from e-Builder again.
        </p>
      )}
    </div>
  );
}

/** Renders PDF, image, and Word document previews for Ivy file-preview artifacts. */
export function FilePreviewView({ preview, compact = false }: FilePreviewViewProps) {
  const canInlinePreview = inferPreviewable(preview);
  const renderUrl = resolveRenderUrl(preview);
  const directInlineSource = resolveDirectInlineSource(preview);
  const downloadHref = resolveDownloadHref(preview);
  const height = compact ? 240 : 480;
  const isDirectImage =
    Boolean(directInlineSource) &&
    isImageContentType(preview.contentType) &&
    !resolveFileName(preview).toLowerCase().endsWith(".docx") &&
    !resolveFileName(preview).toLowerCase().endsWith(".doc");

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-sm">{preview.title}</h3>
          {preview.metadata ? (
            <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
              {Object.entries(preview.metadata).map(([key, value]) => (
                <span key={key}>
                  {key}: {value}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        {downloadHref ? (
          <a
            className="inline-flex items-center gap-1 text-sky-600 text-xs hover:underline dark:text-sky-400"
            download={preview.title}
            href={downloadHref}
            rel="noopener noreferrer"
            target="_blank"
          >
            Open
            <ExternalLinkIcon className="size-3" />
          </a>
        ) : null}
      </div>

      {renderUrl && canInlinePreview ? (
        <DocumentPreviewFrame
          compact={compact}
          downloadHref={downloadHref}
          preview={preview}
          renderUrl={renderUrl}
        />
      ) : directInlineSource && canInlinePreview ? (
        <div
          className="overflow-hidden rounded-lg border border-border/60 bg-muted/20"
          style={{ height }}
        >
          {isDirectImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed S3 URLs
            <img
              alt={preview.title}
              className="size-full object-contain"
              src={directInlineSource}
            />
          ) : (
            <iframe
              className="size-full border-0 bg-white"
              src={directInlineSource}
              title={preview.title}
            />
          )}
        </div>
      ) : (
        <DownloadFallback
          downloadHref={downloadHref}
          message={
            canInlinePreview
              ? "Preview requires a valid document from e-Builder."
              : "This file type cannot be previewed inline."
          }
          title={preview.title}
        />
      )}
    </div>
  );
}
