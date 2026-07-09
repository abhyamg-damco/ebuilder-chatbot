"use client";

import { FileTextIcon, MonitorIcon, PanelLeftIcon } from "lucide-react";
import Link from "next/link";
import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { VercelIcon } from "./icons";
import { VisibilitySelector, type VisibilityType } from "./visibility-selector";

function PureChatHeader({
  chatId,
  selectedVisibilityType,
  isReadonly,
  uploadCount = 0,
  hasActiveBrowser = false,
  onOpenBrowser,
}: {
  chatId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  uploadCount?: number;
  hasActiveBrowser?: boolean;
  onOpenBrowser?: () => void;
}) {
  const { state, toggleSidebar, isMobile } = useSidebar();

  if (state === "collapsed" && !isMobile) {
    return null;
  }

  return (
    <header className="sticky top-0 flex h-14 items-center gap-2 bg-sidebar px-3">
      <Button
        className="md:hidden"
        onClick={toggleSidebar}
        size="icon-sm"
        variant="ghost"
      >
        <PanelLeftIcon className="size-4" />
      </Button>

      <Link
        className="flex size-8 items-center justify-center rounded-lg md:hidden"
        href="https://vercel.com/templates/next.js/chatbot"
        rel="noopener noreferrer"
        target="_blank"
      >
        <VercelIcon size={14} />
      </Link>

      {!isReadonly && (
        <VisibilitySelector
          chatId={chatId}
          selectedVisibilityType={selectedVisibilityType}
        />
      )}

      <div className="ml-auto flex items-center gap-2">
        {uploadCount > 0 ? (
          <Badge
            className="h-6 gap-1 rounded-md px-2 text-[11px] font-normal"
            data-testid="chat-upload-count"
            variant="outline"
          >
            <FileTextIcon />
            {uploadCount} file{uploadCount === 1 ? "" : "s"}
          </Badge>
        ) : null}
        {hasActiveBrowser ? (
          <Badge
            asChild
            className="h-6 cursor-pointer gap-1 rounded-md px-2 text-[11px] font-normal hover:bg-muted"
            data-testid="chat-browser-session-count"
            variant="outline"
          >
            <button onClick={onOpenBrowser} type="button">
              <MonitorIcon />
              1 browser
            </button>
          </Badge>
        ) : null}
      </div>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.chatId === nextProps.chatId &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType &&
    prevProps.isReadonly === nextProps.isReadonly &&
    prevProps.uploadCount === nextProps.uploadCount &&
    prevProps.hasActiveBrowser === nextProps.hasActiveBrowser &&
    prevProps.onOpenBrowser === nextProps.onOpenBrowser
  );
});
