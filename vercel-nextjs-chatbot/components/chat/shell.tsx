"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSession } from "next-auth/react";
import { useActiveChat } from "@/hooks/use-active-chat";
import { useChatMetadata } from "@/hooks/use-chat-metadata";
import {
  initialBrowserPanelData,
  useBrowserPanel,
  useBrowserPanelSelector,
} from "@/hooks/use-browser-panel";
import { useBrowserIdleClose } from "@/hooks/use-browser-idle-close";
import { useBrowserbaseEnabled } from "@/hooks/use-browserbase-enabled";
import { useOpenBrowserPanel } from "@/hooks/use-open-browser-panel";
import {
  initialArtifactData,
  useArtifact,
  useArtifactSelector,
} from "@/hooks/use-artifact";
import type { Attachment, ChatMessage } from "@/lib/types";
import { guestRegex } from "@/lib/constants";
import { cn, generateUUID } from "@/lib/utils";
import { Artifact } from "./artifact";
import { BrowserPanel } from "./browser-panel";
import { ChatHeader } from "./chat-header";
import { DataStreamHandler } from "./data-stream-handler";
import { submitEditedMessage } from "./message-editor";
import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";
import {
  buildInvoiceReviewKickoffText,
  InvoiceReviewSetupForm,
} from "./invoice-review-setup-form";
import { SessionTypePicker } from "./session-type-picker";
import {
  buildTrimbleKickoffText,
  TrimbleSetupForm,
} from "./trimble-setup-form";

export function ChatShell() {
  const {
    chatId,
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    addToolApprovalResponse,
    input,
    setInput,
    visibilityType,
    isReadonly,
    isLoading,
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
    invoiceReviewSetupComplete,
    setInvoiceReviewSetupComplete,
    setInvoiceReviewConfig,
    showSessionPicker,
  } = useActiveChat();

  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(
    null
  );
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const { data: chatMetadata } = useChatMetadata(chatId, !isLoading);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);
  const isBrowserPanelVisible = useBrowserPanelSelector(
    (state) => state.isVisible
  );
  const showRightPanel = isArtifactVisible || isBrowserPanelVisible;
  const { setArtifact } = useArtifact();
  const { setBrowserPanel } = useBrowserPanel();

  const stopRef = useRef(stop);
  stopRef.current = stop;

  const prevChatIdRef = useRef(chatId);
  useEffect(() => {
    if (prevChatIdRef.current !== chatId) {
      prevChatIdRef.current = chatId;
      stopRef.current();
      setArtifact(initialArtifactData);
      setBrowserPanel(initialBrowserPanelData);
      setEditingMessage(null);
      setAttachments([]);
    }
  }, [chatId, setArtifact, setBrowserPanel]);

  const browserPanelSessionId = useBrowserPanelSelector((state) => state.sessionId);
  const browserPanelStatus = useBrowserPanelSelector((state) => state.status);
  const { openBrowserPanel, hasActiveBrowser: hasPersistedBrowser } =
    useOpenBrowserPanel(chatId);
  const hasActiveBrowser =
    hasPersistedBrowser ||
    (Boolean(browserPanelSessionId) && browserPanelStatus === "running");
  const { data: sessionData } = useSession();
  const isGuest = guestRegex.test(sessionData?.user?.email ?? "");
  const browserbaseEnabled = useBrowserbaseEnabled();

  useBrowserIdleClose(chatId, status, browserbaseEnabled, !isGuest);

  /** Restore browser session state from metadata — panel opens on user click. */
  useEffect(() => {
    const active = chatMetadata?.browserSessions.active;
    if (!active || isBrowserPanelVisible) {
      return;
    }

    setBrowserPanel((current) => {
      if (current.sessionId === active.browserbaseSessionId) {
        return current;
      }

      return {
        sessionId: active.browserbaseSessionId,
        liveViewUrl: active.liveViewUrl ?? null,
        title: active.title ?? "Live browser",
        status: "running",
        isVisible: false,
      };
    });
  }, [chatMetadata, isBrowserPanelVisible, setBrowserPanel]);

  const uploadCount = chatMetadata?.uploads.count ?? 0;

  /** Hide normal greeting/composer while picking mode or filling Trimble form. */
  const showTrimbleSetup =
    sessionType === "trimble_automation" && !trimbleSetupComplete;
  const showInvoiceReviewSetup =
    sessionType === "invoice_review" && !invoiceReviewSetupComplete;
  const gateComposer =
    showSessionPicker || showTrimbleSetup || showInvoiceReviewSetup;

  return (
    <>
      <div className="flex h-dvh w-full flex-row overflow-hidden">
        <div
          className={cn(
            "flex min-w-0 flex-col bg-sidebar transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
            showRightPanel ? "w-[40%]" : "w-full"
          )}
        >
          <ChatHeader
            chatId={chatId}
            hasActiveBrowser={hasActiveBrowser}
            isReadonly={isReadonly}
            onOpenBrowser={() => {
              if (browserPanelSessionId && browserPanelStatus === "running") {
                setBrowserPanel((current) => ({
                  ...current,
                  isVisible: true,
                }));
                return;
              }

              openBrowserPanel();
            }}
            selectedVisibilityType={visibilityType}
            uploadCount={uploadCount}
          />

          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background md:rounded-tl-[12px] md:border-t md:border-l md:border-border/40">
            {gateComposer ? (
              <div className="flex flex-1 items-center justify-center overflow-y-auto py-8">
                {showSessionPicker ? (
                  <SessionTypePicker onSelect={setSessionType} />
                ) : showTrimbleSetup ? (
                  <TrimbleSetupForm
                    attachments={attachments}
                    chatId={chatId}
                    onProceed={async ({ skill, secretIds }) => {
                      setReferencedSkillIds([skill.id]);
                      setReferencedSecretIds(secretIds);
                      setTrimbleSetupComplete(true);

                      const fileParts = attachments.map((attachment) => ({
                        type: "file" as const,
                        url: attachment.url,
                        name: attachment.name,
                        mediaType: attachment.contentType,
                        uploadId: attachment.id,
                        useInBrowser: true,
                      }));

                      window.history.pushState(
                        {},
                        "",
                        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/chat/${chatId}`
                      );

                      await sendMessage({
                        id: generateUUID(),
                        role: "user",
                        parts: [
                          ...fileParts,
                          {
                            type: "text",
                            text: buildTrimbleKickoffText(skill.slug),
                          },
                        ],
                      });

                      setAttachments([]);
                    }}
                    setAttachments={setAttachments}
                    visibilityType={visibilityType}
                  />
                ) : (
                  <InvoiceReviewSetupForm
                    onProceed={async (config) => {
                      setInvoiceReviewConfig(config);
                      setInvoiceReviewSetupComplete(true);

                      window.history.pushState(
                        {},
                        "",
                        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/chat/${chatId}`
                      );

                      await sendMessage({
                        id: generateUUID(),
                        role: "user",
                        parts: [
                          {
                            type: "text",
                            text: buildInvoiceReviewKickoffText(),
                          },
                        ],
                      });
                    }}
                  />
                )}
              </div>
            ) : (
              <>
                <Messages
                  addToolApprovalResponse={addToolApprovalResponse}
                  chatId={chatId}
                  isArtifactVisible={showRightPanel}
                  isLoading={isLoading}
                  isReadonly={isReadonly}
                  messages={messages}
                  onEditMessage={(msg) => {
                    const text = msg.parts
                      ?.filter((p) => p.type === "text")
                      .map((p) => p.text)
                      .join("");
                    setInput(text ?? "");
                    setEditingMessage(msg);
                  }}
                  regenerate={regenerate}
                  selectedModelId={currentModelId}
                  setMessages={setMessages}
                  status={status}
                  votes={votes}
                />

                <div className="sticky bottom-0 z-1 mx-auto flex w-full max-w-4xl gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4">
                  {!isReadonly && (
                    <MultimodalInput
                      attachments={attachments}
                      chatId={chatId}
                      editingMessage={editingMessage}
                      input={input}
                      isLoading={isLoading}
                      messages={messages}
                      onCancelEdit={() => {
                        setEditingMessage(null);
                        setInput("");
                      }}
                      onModelChange={setCurrentModelId}
                      selectedModelId={currentModelId}
                      selectedVisibilityType={visibilityType}
                      sendMessage={
                        editingMessage
                          ? async () => {
                              const msg = editingMessage;
                              setEditingMessage(null);
                              await submitEditedMessage({
                                message: msg,
                                text: input,
                                setMessages,
                                regenerate,
                              });
                              setInput("");
                            }
                          : sendMessage
                      }
                      setAttachments={setAttachments}
                      setInput={setInput}
                      setMessages={setMessages}
                      status={status}
                      stop={stop}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {isBrowserPanelVisible ? (
          <BrowserPanel chatId={chatId} />
        ) : (
          <Artifact
            addToolApprovalResponse={addToolApprovalResponse}
            attachments={attachments}
            chatId={chatId}
            input={input}
            isReadonly={isReadonly}
            messages={messages}
            regenerate={regenerate}
            selectedModelId={currentModelId}
            selectedVisibilityType={visibilityType}
            sendMessage={sendMessage}
            setAttachments={setAttachments}
            setInput={setInput}
            setMessages={setMessages}
            status={status}
            stop={stop}
            votes={votes}
          />
        )}
      </div>

      <DataStreamHandler />

      <AlertDialog
        onOpenChange={setShowCreditCardAlert}
        open={showCreditCardAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate AI Gateway</AlertDialogTitle>
            <AlertDialogDescription>
              This application requires{" "}
              {process.env.NODE_ENV === "production" ? "the owner" : "you"} to
              activate Vercel AI Gateway.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                window.open(
                  "https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card",
                  "_blank"
                );
                window.location.href = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/`;
              }}
            >
              Activate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
