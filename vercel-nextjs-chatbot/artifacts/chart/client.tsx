"use client";

import { CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { ChartView } from "@/components/insights/chart-view";
import { Artifact } from "@/components/chat/create-artifact";
import { parseChartContent } from "@/lib/insights/types";

type Metadata = Record<string, never>;

function ChartArtifactContent({ content }: { content: string }) {
  const chart = parseChartContent(content);

  if (!chart) {
    return (
      <pre className="overflow-auto p-4 font-mono text-xs leading-relaxed">
        {content}
      </pre>
    );
  }

  return <ChartView chart={chart} />;
}

export const chartArtifact = new Artifact<"chart", Metadata>({
  kind: "chart",
  description: "Bar, line, or area charts for time series and comparisons",
  initialize: () => null,
  onStreamPart: ({ setArtifact, streamPart }) => {
    if (streamPart.type === "data-chartDelta") {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.data,
        isVisible: true,
        status: "streaming",
      }));
    }
  },
  content: ({ content }) => <ChartArtifactContent content={content} />,
  toolbar: [],
  actions: [
    {
      icon: <CopyIcon className="size-4" />,
      description: "Copy chart JSON",
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success("Copied chart data");
      },
    },
  ],
});
