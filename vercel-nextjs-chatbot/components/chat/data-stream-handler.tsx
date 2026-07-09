"use client";

import { useEffect } from "react";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { useActiveChat } from "@/hooks/use-active-chat";
import { initialArtifactData, useArtifact } from "@/hooks/use-artifact";
import { useBrowserPanel } from "@/hooks/use-browser-panel";
import { artifactDefinitions } from "./artifact";
import { useDataStream } from "./data-stream-provider";
import { getChatHistoryPaginationKey } from "./sidebar-history";

export function DataStreamHandler() {
  const { dataStream, setDataStream } = useDataStream();
  const { mutate } = useSWRConfig();
  const { chatId } = useActiveChat();

  const { artifact, setArtifact, setMetadata } = useArtifact();
  const { setBrowserPanel } = useBrowserPanel();

  const metadataKey = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/chat/${chatId}/metadata`;

  useEffect(() => {
    if (!dataStream?.length) {
      return;
    }

    const newDeltas = dataStream.slice();
    setDataStream([]);

    for (const delta of newDeltas) {
      if (delta.type === "data-chat-title") {
        mutate(unstable_serialize(getChatHistoryPaginationKey));
        continue;
      }

      if (delta.type === "data-browserSession") {
        // Live browser event from session-store.ts — opens BrowserPanel on the right.
        const { sessionId, liveViewUrl, status, title } = delta.data;

        setBrowserPanel((current) => ({
          ...current,
          sessionId,
          liveViewUrl: liveViewUrl ?? current.liveViewUrl,
          title: title ?? current.title,
          status: status === "ended" ? "ended" : "running",
          isVisible: status === "running" ? true : current.isVisible,
        }));
        void mutate(metadataKey);
        continue;
      }
      const artifactDefinition = artifactDefinitions.find(
        (currentArtifactDefinition) =>
          currentArtifactDefinition.kind === artifact.kind
      );

      if (artifactDefinition?.onStreamPart) {
        artifactDefinition.onStreamPart({
          streamPart: delta,
          setArtifact,
          setMetadata,
        });
      }

      setArtifact((draftArtifact) => {
        if (!draftArtifact) {
          return { ...initialArtifactData, status: "streaming" };
        }

        switch (delta.type) {
          case "data-id":
            return {
              ...draftArtifact,
              documentId: delta.data,
              status: "streaming",
            };

          case "data-title":
            return {
              ...draftArtifact,
              title: delta.data,
              status: "streaming",
            };

          case "data-kind":
            return {
              ...draftArtifact,
              kind: delta.data,
              status: "streaming",
            };

          case "data-clear":
            return {
              ...draftArtifact,
              content: "",
              status: "streaming",
            };

          case "data-finish":
            return {
              ...draftArtifact,
              status: "idle",
            };

          default:
            return draftArtifact;
        }
      });
    }
  }, [dataStream, setArtifact, setMetadata, artifact, setDataStream, mutate, setBrowserPanel, metadataKey]);

  return null;
}
