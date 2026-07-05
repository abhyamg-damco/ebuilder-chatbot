"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ChatShell } from "./shell";

/** Hide the chat UI on settings routes so those pages own the full viewport. */
export function ChatLayoutGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const settingsPrefix = `${basePath}/settings`;
  const isSettingsRoute =
    pathname === settingsPrefix || pathname.startsWith(`${settingsPrefix}/`);

  if (isSettingsRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <ChatShell />
      {children}
    </>
  );
}
