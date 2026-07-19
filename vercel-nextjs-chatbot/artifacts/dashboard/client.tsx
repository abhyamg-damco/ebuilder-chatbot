"use client";

import { CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { DashboardView } from "@/components/insights/dashboard-view";
import { Artifact } from "@/components/chat/create-artifact";
import { parseDashboardContent } from "@/lib/insights/types";

type Metadata = Record<string, never>;

function DashboardArtifactContent({ content }: { content: string }) {
  const dashboard = parseDashboardContent(content);

  if (!dashboard) {
    return (
      <pre className="overflow-auto p-4 font-mono text-xs leading-relaxed">
        {content}
      </pre>
    );
  }

  return <DashboardView dashboard={dashboard} />;
}

export const dashboardArtifact = new Artifact<"dashboard", Metadata>({
  kind: "dashboard",
  description: "KPI summary with optional chart and data table",
  initialize: () => null,
  onStreamPart: ({ setArtifact, streamPart }) => {
    if (streamPart.type === "data-dashboardDelta") {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.data,
        isVisible: true,
        status: "streaming",
      }));
    }
  },
  content: ({ content }) => <DashboardArtifactContent content={content} />,
  toolbar: [],
  actions: [
    {
      icon: <CopyIcon className="size-4" />,
      description: "Copy dashboard JSON",
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success("Copied dashboard data");
      },
    },
  ],
});
