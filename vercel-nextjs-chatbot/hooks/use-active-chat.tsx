"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { usePathname, useSearchParams } from "next/navigation";
import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useSWR, { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { useDataStream } from "@/components/chat/data-stream-provider";
import { useAgentActivityContext } from "@/components/chat/agent-activity-provider";
import { getChatHistoryPaginationKey } from "@/components/chat/sidebar-history";
import { toast } from "@/components/chat/toast";
import type { VisibilityType } from "@/components/chat/visibility-selector";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import type { ChatSessionType, Vote } from "@/lib/db/schema";
import { ChatbotError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import { fetcher, fetchWithErrorHandlers, generateUUID } from "@/lib/utils";

/** Default model for Trimble automation sessions. */
export const TRIMBLE_DEFAULT_MODEL = "gpt-5.5";

export type SessionTypeSelection = ChatSessionType | null;

type ActiveChatContextValue = {
  chatId: string;
  isNewChat: boolean;
  messages: ChatMessage[];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  status: UseChatHelpers<ChatMessage>["status"];
  stop: UseChatHelpers<ChatMessage>["stop"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  addToolApprovalResponse: UseChatHelpers<ChatMessage>["addToolApprovalResponse"];
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  visibilityType: VisibilityType;
  isReadonly: boolean;
  isLoading: boolean;
  votes: Vote[] | undefined;
  currentModelId: string;
  setCurrentModelId: (id: string) => void;
  showCreditCardAlert: boolean;
  setShowCreditCardAlert: Dispatch<SetStateAction<boolean>>;
  setReferencedSkillIds: (ids: string[]) => void;
  setReferencedSecretIds: (ids: string[]) => void;
  /** null = show picker (New chat with selectSession); otherwise chosen mode. */
  sessionType: SessionTypeSelection;
  setSessionType: (type: ChatSessionType) => void;
  /** Trimble pre-form completed; composer unlocked. */
  trimbleSetupComplete: boolean;
  setTrimbleSetupComplete: (complete: boolean) => void;
  /** True when New chat asked for a mode picker (`?selectSession=1`). */
  showSessionPicker: boolean;
};

const ActiveChatContext = createContext<ActiveChatContextValue | null>(null);

function extractChatId(pathname: string): string | null {
  const match = pathname.match(/\/chat\/([^/]+)/);
  return match ? match[1] : null;
}

/** Strip selectSession from the URL without a full navigation. */
function clearSelectSessionQuery() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("selectSession")) {
    return;
  }
  params.delete("selectSession");
  const qs = params.toString();
  const base = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${window.location.pathname}`;
  window.history.replaceState({}, "", qs ? `${base}?${qs}` : base);
}

export function ActiveChatProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setDataStream } = useDataStream();
  const { ingestActivityEvent, resetForChat } = useAgentActivityContext();
  const { mutate } = useSWRConfig();

  const chatIdFromUrl = extractChatId(pathname);
  const isNewChat = !chatIdFromUrl;
  const newChatIdRef = useRef(generateUUID());
  const prevPathnameRef = useRef(pathname);

  if (isNewChat && prevPathnameRef.current !== pathname) {
    newChatIdRef.current = generateUUID();
  }
  prevPathnameRef.current = pathname;

  const chatId = chatIdFromUrl ?? newChatIdRef.current;

  const wantsSessionPicker =
    isNewChat && searchParams.get("selectSession") === "1";

  const [sessionType, setSessionTypeState] = useState<SessionTypeSelection>(
    () => (wantsSessionPicker ? null : "general")
  );
  const [trimbleSetupComplete, setTrimbleSetupComplete] = useState(false);

  const sessionTypeRef = useRef(sessionType);
  useEffect(() => {
    sessionTypeRef.current = sessionType;
  }, [sessionType]);

  const [currentModelId, setCurrentModelId] = useState(DEFAULT_CHAT_MODEL);
  const currentModelIdRef = useRef(currentModelId);
  useEffect(() => {
    currentModelIdRef.current = currentModelId;
  }, [currentModelId]);

  const [input, setInput] = useState("");
  const [showCreditCardAlert, setShowCreditCardAlert] = useState(false);
  const referencedSkillIdsRef = useRef<string[]>([]);
  const referencedSecretIdsRef = useRef<string[]>([]);

  const setReferencedSkillIds = useCallback((ids: string[]) => {
    referencedSkillIdsRef.current = ids;
  }, []);

  const setReferencedSecretIds = useCallback((ids: string[]) => {
    referencedSecretIdsRef.current = ids;
  }, []);

  const setSessionType = useCallback((type: ChatSessionType) => {
    setSessionTypeState(type);
    sessionTypeRef.current = type;
    if (type === "trimble_automation") {
      setCurrentModelId(TRIMBLE_DEFAULT_MODEL);
      setTrimbleSetupComplete(false);
    } else {
      setCurrentModelId(DEFAULT_CHAT_MODEL);
      setTrimbleSetupComplete(true);
    }
    clearSelectSessionQuery();
  }, []);

  // Reset session state only when entering a new empty chat — not when the
  // user picks a type and we strip `?selectSession=1` (that used to wipe Trimble
  // back to general and skip the setup form).
  const selectSessionKey = wantsSessionPicker ? "1" : "0";
  const prevSelectKeyRef = useRef(selectSessionKey);
  const prevIsNewChatRef = useRef(isNewChat);

  useEffect(() => {
    const becameNewChat = isNewChat && !prevIsNewChatRef.current;
    const pickerRequested =
      selectSessionKey === "1" && prevSelectKeyRef.current !== "1";
    prevIsNewChatRef.current = isNewChat;
    prevSelectKeyRef.current = selectSessionKey;

    if (!isNewChat) {
      return;
    }

    // User chose a session type → query cleared (1→0). Keep their selection.
    if (!becameNewChat && !pickerRequested) {
      return;
    }

    newChatIdRef.current = generateUUID();
    if (wantsSessionPicker) {
      setSessionTypeState(null);
      setTrimbleSetupComplete(false);
      setCurrentModelId(DEFAULT_CHAT_MODEL);
    } else {
      // Base URL `/` (or new chat without picker flag) → eBuilder default.
      setSessionTypeState("general");
      setTrimbleSetupComplete(true);
      setCurrentModelId(DEFAULT_CHAT_MODEL);
    }
    referencedSkillIdsRef.current = [];
    referencedSecretIdsRef.current = [];
  }, [isNewChat, selectSessionKey, wantsSessionPicker]);

  const { data: chatData, isLoading } = useSWR(
    isNewChat
      ? null
      : `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/messages?chatId=${chatId}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Hydrate session type from an existing chat.
  useEffect(() => {
    if (isNewChat || !chatData) {
      return;
    }
    const stored = chatData.sessionType as ChatSessionType | null | undefined;
    if (stored === "trimble_automation" || stored === "general") {
      setSessionTypeState(stored);
      setTrimbleSetupComplete(true);
      if (stored === "trimble_automation") {
        setCurrentModelId(TRIMBLE_DEFAULT_MODEL);
      }
    }
  }, [chatData, isNewChat]);

  const initialMessages: ChatMessage[] = isNewChat
    ? []
    : (chatData?.messages ?? []);
  const visibility: VisibilityType = isNewChat
    ? "private"
    : (chatData?.visibility ?? "private");

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    resumeStream,
    addToolApprovalResponse,
  } = useChat<ChatMessage>({
    id: chatId,
    messages: initialMessages,
    generateId: generateUUID,
    sendAutomaticallyWhen: ({ messages: currentMessages }) => {
      const lastMessage = currentMessages.at(-1);
      return (
        lastMessage?.parts?.some(
          (part) =>
            "state" in part &&
            part.state === "approval-responded" &&
            "approval" in part &&
            (part.approval as { approved?: boolean })?.approved === true
        ) ?? false
      );
    },
    transport: new DefaultChatTransport({
      api: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/chat`,
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest(request) {
        const lastMessage = request.messages.at(-1);
        const isToolApprovalContinuation =
          lastMessage?.role !== "user" ||
          request.messages.some((msg) =>
            msg.parts?.some((part) => {
              const state = (part as { state?: string }).state;
              return (
                state === "approval-responded" || state === "output-denied"
              );
            })
          );

        return {
          body: {
            id: request.id,
            ...(isToolApprovalContinuation
              ? { messages: request.messages }
              : { message: lastMessage }),
            selectedChatModel: currentModelIdRef.current,
            selectedVisibilityType: visibility,
            ...(sessionTypeRef.current
              ? { sessionType: sessionTypeRef.current }
              : {}),
            ...(referencedSkillIdsRef.current.length > 0
              ? { referencedSkillIds: referencedSkillIdsRef.current }
              : {}),
            ...(referencedSecretIdsRef.current.length > 0
              ? { referencedSecretIds: referencedSecretIdsRef.current }
              : {}),
            ...request.body,
          },
        };
      },
    }),
    onData: (dataPart) => {
      if (dataPart.type === "data-agent-activity") {
        ingestActivityEvent(dataPart.data);
      }

      setDataStream((ds) => (ds ? [...ds, dataPart] : []));
    },
    onFinish: () => {
      mutate(unstable_serialize(getChatHistoryPaginationKey));
    },
    onError: (error) => {
      if (error.message?.includes("AI Gateway requires a valid credit card")) {
        setShowCreditCardAlert(true);
      } else if (error instanceof ChatbotError) {
        toast({ type: "error", description: error.message });
      } else {
        toast({
          type: "error",
          description: error.message || "Oops, an error occurred!",
        });
      }
    },
  });

  const loadedChatIds = useRef(new Set<string>());

  if (isNewChat && !loadedChatIds.current.has(newChatIdRef.current)) {
    loadedChatIds.current.add(newChatIdRef.current);
  }

  useEffect(() => {
    if (loadedChatIds.current.has(chatId)) {
      return;
    }
    if (chatData?.messages) {
      loadedChatIds.current.add(chatId);
      setMessages(chatData.messages);
    }
  }, [chatId, chatData?.messages, setMessages]);

  const prevChatIdRef = useRef(chatId);
  useEffect(() => {
    if (prevChatIdRef.current !== chatId) {
      prevChatIdRef.current = chatId;
      resetForChat(chatId);
      if (isNewChat) {
        setMessages([]);
      }
    }
  }, [chatId, isNewChat, resetForChat, setMessages]);

  useEffect(() => {
    if (chatData && !isNewChat) {
      const cookieModel = document.cookie
        .split("; ")
        .find((row) => row.startsWith("chat-model="))
        ?.split("=")[1];
      if (cookieModel) {
        setCurrentModelId(decodeURIComponent(cookieModel));
      }
    }
  }, [chatData, isNewChat]);

  const hasAppendedQueryRef = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get("query");
    if (query && !hasAppendedQueryRef.current) {
      hasAppendedQueryRef.current = true;
      window.history.replaceState(
        {},
        "",
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/chat/${chatId}`
      );
      sendMessage({
        role: "user" as const,
        parts: [{ type: "text", text: query }],
      });
    }
  }, [sendMessage, chatId]);

  useAutoResume({
    autoResume: !isNewChat && !!chatData,
    initialMessages,
    resumeStream,
    setMessages,
  });

  const isReadonly = isNewChat ? false : (chatData?.isReadonly ?? false);

  const { data: votes } = useSWR<Vote[]>(
    !isReadonly && messages.length >= 2
      ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/vote?chatId=${chatId}`
      : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const showSessionPicker = isNewChat && sessionType === null;

  const value = useMemo<ActiveChatContextValue>(
    () => ({
      chatId,
      isNewChat,
      messages,
      setMessages,
      sendMessage,
      status,
      stop,
      regenerate,
      addToolApprovalResponse,
      input,
      setInput,
      visibilityType: visibility,
      isReadonly,
      isLoading: !isNewChat && isLoading,
      votes,
      currentModelId,
      setCurrentModelId,
      showCreditCardAlert,
      setShowCreditCardAlert,
      setReferencedSkillIds,
      setReferencedSecretIds,
      sessionType,
      setSessionType,
      trimbleSetupComplete,
      setTrimbleSetupComplete,
      showSessionPicker,
    }),
    [
      chatId,
      isNewChat,
      messages,
      setMessages,
      sendMessage,
      status,
      stop,
      regenerate,
      addToolApprovalResponse,
      input,
      visibility,
      isReadonly,
      isLoading,
      votes,
      currentModelId,
      showCreditCardAlert,
      setReferencedSkillIds,
      setReferencedSecretIds,
      sessionType,
      setSessionType,
      trimbleSetupComplete,
      showSessionPicker,
    ]
  );

  return (
    <ActiveChatContext.Provider value={value}>
      {children}
    </ActiveChatContext.Provider>
  );
}

export function useActiveChat() {
  const context = useContext(ActiveChatContext);
  if (!context) {
    throw new Error("useActiveChat must be used within ActiveChatProvider");
  }
  return context;
}
