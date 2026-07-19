"use client";

import { CopyIcon, ExternalLinkIcon } from "lucide-react";
import { toast } from "sonner";
import { FilePreviewView } from "@/components/insights/file-preview-view";
import { Artifact } from "@/components/chat/create-artifact";
import { parseFilePreviewContent } from "@/lib/insights/types";

type Metadata = Record<string, never>;

function FilePreviewArtifactContent({ content }: { content: string }) {
  const preview = parseFilePreviewContent(content);

  if (!preview) {
    return (
      <pre className="overflow-auto p-4 font-mono text-xs leading-relaxed">
        {content}
      </pre>
    );
  }

  return <FilePreviewView preview={preview} />;
}

export const filePreviewArtifact = new Artifact<"file-preview", Metadata>({
  kind: "file-preview",
  description: "PDF or image preview for invoices and supporting documents",
  initialize: () => null,
  onStreamPart: ({ setArtifact, streamPart }) => {
    if (streamPart.type === "data-filePreviewDelta") {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.data,
        isVisible: true,
        status: "streaming",
      }));
    }
  },
  content: ({ content }) => <FilePreviewArtifactContent content={content} />,
  toolbar: [],
  actions: [
    {
      icon: <ExternalLinkIcon className="size-4" />,
      description: "Open file in new tab",
      onClick: ({ content }) => {
        const preview = parseFilePreviewContent(content);
        if (preview?.fileUrl) {
          window.open(preview.fileUrl, "_blank", "noopener,noreferrer");
        }
      },
    },
    {
      icon: <CopyIcon className="size-4" />,
      description: "Copy preview JSON",
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success("Copied file preview data");
      },
    },
  ],
});
