import { FileTextIcon } from "lucide-react";
import Image from "next/image";
import type { Attachment } from "@/lib/types";
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
}: {
  attachment: Attachment;
  isUploading?: boolean;
  onRemove?: () => void;
}) => {
  const { name, url, contentType, category, sizeBytes } = attachment;
  const isImage =
    category === "image" || contentType?.startsWith("image/");

  return (
    <div
      className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-muted"
      data-testid="input-attachment-preview"
    >
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
            <span className="text-[9px] opacity-70">{formatBytes(sizeBytes)}</span>
          ) : null}
        </div>
      )}

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
  );
};
