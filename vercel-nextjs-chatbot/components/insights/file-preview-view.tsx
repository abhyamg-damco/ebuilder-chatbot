"use client";

import { ExternalLinkIcon } from "lucide-react";
import type { FilePreviewContent } from "@/lib/insights/types";

type FilePreviewViewProps = {
  preview: FilePreviewContent;
  compact?: boolean;
};

function isImageContentType(contentType?: string): boolean {
  if (!contentType) {
    return false;
  }
  return contentType.startsWith("image/");
}

/** Renders PDF or image previews for Ivy file-preview artifacts. */
export function FilePreviewView({ preview, compact = false }: FilePreviewViewProps) {
  const isImage = isImageContentType(preview.contentType);
  const height = compact ? 240 : 480;

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
        <a
          className="inline-flex items-center gap-1 text-sky-600 text-xs hover:underline dark:text-sky-400"
          href={preview.fileUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          Open
          <ExternalLinkIcon className="size-3" />
        </a>
      </div>

      <div
        className="overflow-hidden rounded-lg border border-border/60 bg-muted/20"
        style={{ height }}
      >
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- external e-Builder or signed URLs
          <img
            alt={preview.title}
            className="size-full object-contain"
            src={preview.fileUrl}
          />
        ) : (
          <iframe
            className="size-full border-0"
            src={preview.fileUrl}
            title={preview.title}
          />
        )}
      </div>
    </div>
  );
}
