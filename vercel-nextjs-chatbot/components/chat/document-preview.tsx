"use client";

import equal from "fast-deep-equal";
import {
  type MouseEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import useSWR from "swr";
import { BriefView } from "@/artifacts/advisory-brief/client";
import { ChartView } from "@/components/insights/chart-view";
import { DashboardView } from "@/components/insights/dashboard-view";
import { FilePreviewView } from "@/components/insights/file-preview-view";
import { useArtifact } from "@/hooks/use-artifact";
import {
  parseChartContent,
  parseDashboardContent,
  parseFilePreviewContent,
} from "@/lib/insights/types";
import type { Document } from "@/lib/db/schema";
import { cn, fetcher } from "@/lib/utils";
import type { ArtifactKind, UIArtifact } from "./artifact";
import { CodeEditor } from "./code-editor";
import { InlineDocumentSkeleton } from "./document-skeleton";
import {
  CodeIcon,
  FileIcon,
  FullscreenIcon,
  ImageIcon,
  LineChartIcon,
  LoaderIcon,
} from "./icons";
import { ImageEditor } from "./image-editor";
import { SpreadsheetEditor } from "./sheet-editor";
import { Editor } from "./text-editor";

type DocumentToolOutput = {
  id: string;
  title: string;
  kind: ArtifactKind;
  content?: string;
};

type DocumentPreviewProps = {
  isReadonly: boolean;
  result?: Partial<DocumentToolOutput>;
  args?: Partial<DocumentToolOutput> & { isUpdate?: boolean };
};

const WIDE_INSIGHT_KINDS = new Set<ArtifactKind>([
  "chart",
  "dashboard",
  "file-preview",
  "advisory-brief",
]);

function previewMaxWidth(kind: ArtifactKind): string {
  return WIDE_INSIGHT_KINDS.has(kind) ? "max-w-[600px]" : "max-w-[450px]";
}

export function DocumentPreview({
  isReadonly: _isReadonly,
  result,
  args,
}: DocumentPreviewProps) {
  const { artifact, setArtifact } = useArtifact();

  const { data: documents, isLoading: isDocumentsFetching } = useSWR<
    Document[]
  >(
    result
      ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/document?id=${result.id}`
      : null,
    fetcher
  );

  const previewDocument = useMemo(() => documents?.[0], [documents]);
  const hitboxRef = useRef<HTMLDivElement>(null);
  const displayKind =
    result?.kind ?? args?.kind ?? previewDocument?.kind ?? artifact.kind;

  useEffect(() => {
    const boundingBox = hitboxRef.current?.getBoundingClientRect();

    if (artifact.documentId && boundingBox) {
      setArtifact((currentArtifact) => ({
        ...currentArtifact,
        boundingBox: {
          left: boundingBox.x,
          top: boundingBox.y,
          width: boundingBox.width,
          height: boundingBox.height,
        },
      }));
    }
  }, [artifact.documentId, setArtifact]);

  if (isDocumentsFetching) {
    const kind = displayKind;
    const title = result?.title ?? args?.title ?? artifact.title;

    return (
      <div className={cn("w-full", previewMaxWidth(kind))}>
        {title ? (
          <DocumentHeader isStreaming={true} kind={kind} title={title} />
        ) : (
          <div className="flex flex-row items-center justify-between gap-2 rounded-t-2xl border border-b-0 border-border/50 px-4 py-3 dark:bg-muted">
            <div className="flex flex-row items-center gap-2.5">
              <div className="size-3.5 animate-pulse rounded bg-muted-foreground/15" />
              <div className="h-3.5 w-24 animate-pulse rounded bg-muted-foreground/15" />
            </div>
            <div className="w-8" />
          </div>
        )}
        <div className="h-[257px] overflow-hidden rounded-b-2xl border border-t-0 border-border/50 bg-muted p-6">
          <InlineDocumentSkeleton />
        </div>
      </div>
    );
  }

  const document: Document | null = previewDocument
    ? previewDocument
    : artifact.status === "streaming"
      ? {
          title: artifact.title,
          kind: artifact.kind,
          content: artifact.content,
          id: artifact.documentId,
          createdAt: new Date(),
          userId: "noop",
        }
      : null;

  if (!document) {
    return <LoadingSkeleton artifactKind={artifact.kind} />;
  }

  return (
    <div
      className={cn(
        "relative w-full cursor-pointer",
        previewMaxWidth(document.kind)
      )}
    >
      <HitboxLayer
        hitboxRef={hitboxRef}
        result={result}
        setArtifact={setArtifact}
      />
      <DocumentHeader
        isStreaming={artifact.status === "streaming"}
        kind={document.kind}
        title={document.title}
      />
      <DocumentContent document={document} />
    </div>
  );
}

const LoadingSkeleton = ({ artifactKind }: { artifactKind: ArtifactKind }) => (
  <div className={cn("w-full", previewMaxWidth(artifactKind))}>
    <div className="flex flex-row items-center justify-between gap-2 rounded-t-2xl border border-b-0 border-border/50 px-4 py-3 dark:bg-muted">
      <div className="flex flex-row items-center gap-2.5">
        <div className="size-3.5 animate-pulse rounded bg-muted-foreground/15" />
        <div className="h-3.5 w-24 animate-pulse rounded bg-muted-foreground/15" />
      </div>
      <div className="w-8" />
    </div>
    {artifactKind === "image" || artifactKind === "file-preview" ? (
      <div className="overflow-hidden rounded-b-2xl border border-t-0 border-border/50 bg-muted">
        <div className="h-[257px] w-full animate-pulse bg-muted-foreground/10" />
      </div>
    ) : (
      <div className="h-[257px] overflow-hidden rounded-b-2xl border border-t-0 border-border/50 bg-muted p-6">
        <InlineDocumentSkeleton />
      </div>
    )}
  </div>
);

const PureHitboxLayer = ({
  hitboxRef,
  result,
  setArtifact,
}: {
  hitboxRef: React.RefObject<HTMLDivElement>;
  result?: Partial<DocumentToolOutput>;
  setArtifact: (
    updaterFn: UIArtifact | ((currentArtifact: UIArtifact) => UIArtifact)
  ) => void;
}) => {
  const handleClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      const boundingBox = event.currentTarget.getBoundingClientRect();

      setArtifact((artifact) => ({
        ...artifact,
        ...(result?.id && { documentId: result.id }),
        ...(result?.title && { title: result.title }),
        ...(result?.kind && { kind: result.kind }),
        isVisible: true,
        boundingBox: {
          left: boundingBox.x,
          top: boundingBox.y,
          width: boundingBox.width,
          height: boundingBox.height,
        },
      }));
    },
    [setArtifact, result]
  );

  return (
    <div
      aria-hidden="true"
      className="absolute top-0 left-0 z-10 size-full rounded-xl"
      onClick={handleClick}
      ref={hitboxRef}
      role="presentation"
    >
      <div className="flex w-full items-center justify-end p-4">
        <div className="absolute top-[13px] right-[9px] rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <FullscreenIcon />
        </div>
      </div>
    </div>
  );
};

const HitboxLayer = memo(PureHitboxLayer, (prevProps, nextProps) => {
  if (!equal(prevProps.result, nextProps.result)) {
    return false;
  }
  return true;
});

const PureDocumentHeader = ({
  title,
  kind,
  isStreaming,
}: {
  title: string;
  kind: ArtifactKind;
  isStreaming: boolean;
}) => (
  <div className="flex flex-row items-center justify-between gap-2 rounded-t-2xl border border-b-0 border-border/50 px-4 py-3 dark:bg-muted">
    <div className="flex flex-row items-center gap-2.5">
      <div className="text-muted-foreground">
        {isStreaming ? (
          <div className="animate-spin">
            <LoaderIcon size={14} />
          </div>
        ) : kind === "image" || kind === "file-preview" ? (
          <ImageIcon size={14} />
        ) : kind === "chart" || kind === "dashboard" ? (
          <LineChartIcon size={14} />
        ) : kind === "code" ? (
          <CodeIcon size={14} />
        ) : (
          <FileIcon size={14} />
        )}
      </div>
      <div className="font-medium text-sm">{title}</div>
    </div>
    <div className="w-8" />
  </div>
);

const DocumentHeader = memo(PureDocumentHeader, (prevProps, nextProps) => {
  if (prevProps.title !== nextProps.title) {
    return false;
  }
  if (prevProps.isStreaming !== nextProps.isStreaming) {
    return false;
  }

  return true;
});

const DocumentContent = ({ document }: { document: Document }) => {
  const { artifact } = useArtifact();
  const content = document.content ?? "";

  const containerClassName = cn(
    "overflow-hidden rounded-b-2xl border border-t-0 border-border/50 dark:bg-muted",
    {
      "h-[257px] p-4 sm:px-10 sm:py-10": document.kind === "text",
      "h-[257px] p-0": document.kind === "code",
      "h-[280px] p-0":
        document.kind === "chart" ||
        document.kind === "dashboard" ||
        document.kind === "advisory-brief" ||
        document.kind === "file-preview",
    }
  );

  const commonProps = {
    content,
    isCurrentVersion: true,
    currentVersionIndex: 0,
    status: artifact.status,
    saveContent: () => null,
    suggestions: [],
  };

  const handleSaveContent = () => null;

  const chart = parseChartContent(content);
  const dashboard = parseDashboardContent(content);
  const filePreview = parseFilePreviewContent(content);

  return (
    <div className={cn(containerClassName, "relative")}>
      {document.kind === "text" ? (
        <Editor {...commonProps} onSaveContent={handleSaveContent} />
      ) : document.kind === "code" ? (
        <div className="relative flex h-full w-full flex-1">
          <div className="absolute inset-0">
            <CodeEditor {...commonProps} onSaveContent={handleSaveContent} />
          </div>
        </div>
      ) : document.kind === "sheet" ? (
        <div className="relative flex size-full h-[257px] flex-1 p-4">
          <div className="absolute inset-0">
            <SpreadsheetEditor {...commonProps} />
          </div>
        </div>
      ) : document.kind === "image" ? (
        <ImageEditor
          content={content}
          currentVersionIndex={0}
          isCurrentVersion={true}
          isInline={true}
          status={artifact.status}
          title={document.title}
        />
      ) : document.kind === "chart" && chart ? (
        <ChartView chart={chart} compact />
      ) : document.kind === "dashboard" && dashboard ? (
        <DashboardView dashboard={dashboard} compact />
      ) : document.kind === "file-preview" && filePreview ? (
        <FilePreviewView compact preview={filePreview} />
      ) : document.kind === "advisory-brief" ? (
        <BriefView content={content} />
      ) : (
        <pre className="overflow-auto p-4 font-mono text-xs">{content}</pre>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-muted to-transparent dark:from-muted" />
      {document.kind === "code" && (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-muted to-transparent dark:from-muted" />
      )}
    </div>
  );
};
