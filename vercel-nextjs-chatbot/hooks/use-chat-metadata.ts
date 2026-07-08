"use client";

import useSWR from "swr";

export type ChatMetadataUpload = {
  id: string;
  originalFilename: string;
  mimeType: string;
  category: "image" | "document";
  url: string;
  expiresAt: string;
  isPublic: boolean;
  pageCount?: number;
  hasTextPreview: boolean;
  useInBrowser: boolean;
  browserRemotePath?: string;
  browserSyncedSessionId?: string;
  browserSyncedAt?: string;
};

export type ChatMetadataBrowserSession = {
  id: string;
  browserbaseSessionId: string;
  status: string;
  title: string | null;
  startedUrl: string | null;
  lastKnownUrl: string | null;
  liveViewUrl?: string | null;
  replayUrl: string;
  startedAt: string;
  endedAt?: string | null;
  lastActivityAt?: string;
  durationSeconds?: number | null;
  errorMessage?: string | null;
};

export type ChatMetadata = {
  uploads: {
    count: number;
    items: ChatMetadataUpload[];
  };
  browserSessions: {
    active: ChatMetadataBrowserSession | null;
    history: ChatMetadataBrowserSession[];
  };
};

/**
 * Fetches persisted upload and browser session metadata for a chat.
 */
export function useChatMetadata(chatId: string, enabled = true) {
  return useSWR<ChatMetadata>(
    enabled
      ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/chat/${chatId}/metadata`
      : null,
    (url: string) => fetch(url).then((r) => r.json()),
    { revalidateOnFocus: false }
  );
}
