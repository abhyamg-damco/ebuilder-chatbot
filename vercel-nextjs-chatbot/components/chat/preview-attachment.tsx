import { FileTextIcon, GlobeIcon } from "lucide-react";
import Image from "next/image";
import type { Attachment } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Spinner } from "../ui/spinner";
import { CrossSmallIcon } from "./icons";

function formatBytes(bytes?: number): string {
  if (!bytes) {
    return "";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
  onRemove,
  showBrowserToggle = false,
  onUseInBrowserChange,
}: {
  attachment: Attachment;
  isUploading?: boolean;
  onRemove?: () => void;
  /** When true, show the "Use in browser" checkbox (Browserbase configured). */
  showBrowserToggle?: boolean;
  onUseInBrowserChange?: (useInBrowser: boolean) => void;
}) => {
  const { name, url, contentType, category, sizeBytes, useInBrowser } =
    attachment;
  const isImage =
    category === "image" || contentType?.startsWith("image/");

  return (
    <div
      className="group relative flex shrink-0 flex-col gap-1"
      data-testid="input-attachment-preview"
    >
      <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-border/40 bg-muted">
        {isImage && url ? (
          <Image
            alt={name ?? "attachment"}
            className="size-full object-cover"
            height={96}
            src={url}
            unoptimized
            width={96}
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1 px-2 text-center text-muted-foreground">
            <FileTextIcon className="size-5 shrink-0" />
            <span className="line-clamp-2 text-[10px] leading-tight">
              {name ?? "Document"}
            </span>
            {sizeBytes ? (
              <span className="text-[9px] opacity-70">
                {formatBytes(sizeBytes)}
              </span>
            ) : null}
          </div>
        )}

        {useInBrowser ? (
          <div
            className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded bg-primary/90 px-1 py-0.5 text-[8px] font-medium text-primary-foreground"
            title="Will be used in browser"
          >
            <GlobeIcon className="size-2.5" />
            Browser
          </div>
        ) : null}

        {isUploading && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 backdrop-blur-sm"
            data-testid="input-attachment-loader"
          >
            <Spinner className="size-5" />
          </div>
        )}

        {onRemove && !isUploading && (
          <button
            className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/80 group-hover:opacity-100"
            onClick={onRemove}
            type="button"
          >
            <CrossSmallIcon size={10} />
          </button>
        )}
      </div>

      {showBrowserToggle && onUseInBrowserChange && !isUploading ? (
        <label
          className={cn(
            "flex max-w-24 cursor-pointer items-center gap-1.5 text-[10px] leading-tight text-muted-foreground"
          )}
        >
          <input
            checked={useInBrowser ?? false}
            className="size-3 shrink-0 rounded border-border accent-primary"
            onChange={(event) => onUseInBrowserChange(event.target.checked)}
            type="checkbox"
          />
          <span>Use in browser</span>
        </label>
      ) : null}
    </div>
  );
};
