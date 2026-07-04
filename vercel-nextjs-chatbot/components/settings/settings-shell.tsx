import Link from "next/link";
import type { ReactNode } from "react";

export function SettingsShell({
  backHref,
  backLabel,
  children,
}: {
  backHref: string;
  backLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="shrink-0 border-b border-border/40 px-6 py-4 md:px-10">
        <Link
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          href={backHref}
        >
          ← {backLabel}
        </Link>
      </header>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
