"use client";

import { MonitorIcon, SaveIcon } from "lucide-react";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { toast } from "@/components/chat/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_BROWSER_IDLE_TIMEOUT_SECONDS,
  MAX_BROWSER_IDLE_TIMEOUT_SECONDS,
  MIN_BROWSER_IDLE_TIMEOUT_SECONDS,
} from "@/lib/settings/defaults";
import { fetcher } from "@/lib/utils";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type SettingsResponse = {
  browserIdleTimeoutSeconds: number;
  limits: {
    minBrowserIdleTimeoutSeconds: number;
    maxBrowserIdleTimeoutSeconds: number;
    defaultBrowserIdleTimeoutSeconds: number;
  };
};

function secondsToMinutesLabel(seconds: number): string {
  if (seconds % 60 === 0) {
    return String(seconds / 60);
  }

  return (seconds / 60).toFixed(1);
}

function minutesInputToSeconds(value: string): number | null {
  const minutes = Number.parseFloat(value);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return null;
  }

  return Math.round(minutes * 60);
}

/**
 * Platform-wide preferences for the signed-in user.
 */
export function PlatformSettings() {
  const { data, mutate, isLoading } = useSWR<SettingsResponse>(
    `${basePath}/api/settings`,
    fetcher
  );
  const [minutes, setMinutes] = useState(
    String(DEFAULT_BROWSER_IDLE_TIMEOUT_SECONDS / 60)
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!data) {
      return;
    }

    setMinutes(secondsToMinutesLabel(data.browserIdleTimeoutSeconds));
  }, [data]);

  const minMinutes = (data?.limits.minBrowserIdleTimeoutSeconds ??
    MIN_BROWSER_IDLE_TIMEOUT_SECONDS) / 60;
  const maxMinutes = (data?.limits.maxBrowserIdleTimeoutSeconds ??
    MAX_BROWSER_IDLE_TIMEOUT_SECONDS) / 60;

  const handleSave = async () => {
    const browserIdleTimeoutSeconds = minutesInputToSeconds(minutes);

    if (!browserIdleTimeoutSeconds) {
      toast({
        type: "error",
        description: "Enter a valid idle timeout in minutes.",
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`${basePath}/api/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ browserIdleTimeoutSeconds }),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      await mutate();
      toast({ type: "success", description: "Platform settings saved" });
    } catch {
      toast({ type: "error", description: "Failed to save platform settings" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10 md:px-10">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">
          Platform settings
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Configure how cloud browser sessions behave in your chats.
        </p>
      </div>

      <section className="rounded-2xl border border-border/50 bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MonitorIcon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-medium text-base">Browser idle timeout</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              Close the live cloud browser automatically when the agent has not
              used it for this long. Useful while waiting for OTP or manual
              steps between messages.
            </p>

            <div className="mt-5 max-w-xs">
              <Label htmlFor="browser-idle-minutes">Minutes of inactivity</Label>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  disabled={isLoading || isSaving}
                  id="browser-idle-minutes"
                  inputMode="decimal"
                  min={minMinutes}
                  max={maxMinutes}
                  onChange={(event) => {
                    setMinutes(event.target.value);
                  }}
                  step="0.5"
                  type="number"
                  value={minutes}
                />
                <span className="shrink-0 text-muted-foreground text-sm">
                  min
                </span>
              </div>
              <p className="mt-2 text-muted-foreground text-xs">
                Default is 2 minutes. Allowed range: {minMinutes}–{maxMinutes}{" "}
                minutes.
              </p>
            </div>

            <Button
              className="mt-5"
              disabled={isLoading || isSaving}
              onClick={() => {
                void handleSave();
              }}
              type="button"
            >
              <SaveIcon className="size-4" />
              Save changes
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
