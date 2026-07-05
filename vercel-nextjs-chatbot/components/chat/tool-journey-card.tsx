"use client";

import type { DynamicToolUIPart } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import {
  ArrowRightIcon,
  BotIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  CodeIcon,
  DatabaseIcon,
  ServerIcon,
  SparklesIcon,
  XCircleIcon,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  getToolVisualPhase,
  isToolRunning,
  TOOL_JOURNEY_STEPS,
  type ToolVisualPhase,
} from "@/lib/chat/tool-journey";
import type { FormattedParam, FormattedToolOutput } from "@/lib/mcp/utils";
import { cn } from "@/lib/utils";
import { Shimmer } from "../ai-elements/shimmer";
import { ToolReasoningBanner } from "./tool-reasoning-banner";

export type ToolJourneyCardProps = {
  title: string;
  subtitle: string;
  badge?: string;
  state: DynamicToolUIPart["state"];
  params: FormattedParam[];
  formattedOutput: FormattedToolOutput | null;
  errorText?: string;
  input?: unknown;
  output?: unknown;
  icon?: "mcp" | "builtin";
  reasoningSummary?: string;
  modelReasoningSnippet?: string;
  isReasoningLoading?: boolean;
};

function useAnimatedPhase(state: DynamicToolUIPart["state"]): ToolVisualPhase {
  const basePhase = getToolVisualPhase(state);
  const [phase, setPhase] = useState<ToolVisualPhase>(basePhase);

  useEffect(() => {
    if (state === "output-available" || state === "output-error" || state === "output-denied") {
      setPhase(getToolVisualPhase(state));
      return;
    }

    if (state === "input-available") {
      setPhase("sending");
      const timer = window.setTimeout(() => setPhase("fetching"), 850);
      return () => window.clearTimeout(timer);
    }

    setPhase(getToolVisualPhase(state));
  }, [state]);

  return phase;
}

function phaseIndex(phase: ToolVisualPhase): number {
  if (phase === "preparing") return 0;
  if (phase === "sending") return 1;
  if (phase === "fetching") return 2;
  if (phase === "complete") return 3;
  return -1;
}

/** Animated stepper showing Prepare → Send → Fetch → Done. */
function JourneyStepper({
  phase,
  isComplete,
  isError,
}: {
  phase: ToolVisualPhase;
  isComplete: boolean;
  isError: boolean;
}) {
  const currentStep = isComplete || isError ? 3 : phaseIndex(phase);

  return (
    <div className="flex items-center gap-0.5">
      {TOOL_JOURNEY_STEPS.map((step, index) => {
        const isLastStep = index === TOOL_JOURNEY_STEPS.length - 1;
        const isStepFailed = isError && isLastStep;
        const isStepFinished =
          isComplete ||
          (isError && index < 3) ||
          (!isComplete && !isError && currentStep > index);
        const isStepActive =
          !isComplete && !isError && currentStep === index;

        return (
          <div className="flex flex-1 items-center" key={step.id}>
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div
                className={cn(
                  "flex size-6 items-center justify-center rounded-full border text-[10px] font-semibold transition-all duration-500",
                  isStepFailed
                    ? "border-destructive/50 bg-destructive/15 text-destructive"
                    : isStepFinished
                      ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                      : isStepActive
                        ? "step-glow border-primary/50 bg-primary/15 text-primary"
                        : "border-border/60 bg-muted/40 text-muted-foreground"
                )}
              >
                {isStepFailed ? (
                  <XCircleIcon className="size-3.5" />
                ) : isStepFinished ? (
                  <CheckCircle2Icon className="size-3 sparkle-pop" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  "hidden truncate text-[9px] sm:block",
                  isStepFailed
                    ? "font-medium text-destructive"
                    : isStepFinished
                      ? "font-medium text-emerald-700 dark:text-emerald-400"
                      : isStepActive
                        ? "font-medium text-foreground"
                        : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < TOOL_JOURNEY_STEPS.length - 1 ? (
              <div
                className={cn(
                  "mx-0.5 h-0.5 w-full min-w-2 max-w-8 rounded-full transition-colors duration-500",
                  isError && index === TOOL_JOURNEY_STEPS.length - 2
                    ? "bg-destructive/40"
                    : isStepFinished && !isStepFailed
                      ? "bg-emerald-500/50"
                      : "bg-border/60"
                )}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** Agent ↔ server data flow with travelling packets. */
function DataFlowLane({ phase }: { phase: ToolVisualPhase }) {
  const showOutbound = phase === "sending" || phase === "fetching";
  const showInbound = phase === "fetching";

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-r from-muted/30 via-background to-muted/30 px-3 py-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "repeating-linear-gradient(90deg, transparent, transparent 8px, oklch(0.5 0 0 / 4%) 8px, oklch(0.5 0 0 / 4%) 9px)",
        }}
      />

      <div className="relative flex items-center justify-between gap-2">
        <div className="flex flex-col items-center gap-1">
          <div className="flex size-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
            <BotIcon className="size-4 text-primary" />
          </div>
          <span className="text-[9px] text-muted-foreground">Assistant</span>
        </div>

        <div className="relative mx-1 h-8 min-w-0 flex-1">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border/80" />

          {showOutbound ? (
            <>
              <span className="data-packet-out absolute top-1/2 size-2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_6px_oklch(0.55_0.15_250/50%)]" />
              <span
                className="data-packet-out absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-primary/70"
                style={{ animationDelay: "0.7s" }}
              />
            </>
          ) : null}

          {showInbound ? (
            <>
              <span className="data-packet-in absolute top-1/2 size-2 -translate-y-1/2 rounded-full bg-emerald-500 shadow-[0_0_6px_oklch(0.65_0.18_145/50%)]" />
              <span
                className="data-packet-in absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-emerald-500/70"
                style={{ animationDelay: "0.9s" }}
              />
            </>
          ) : null}

          {phase === "complete" ? (
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center"
              initial={{ opacity: 0, scale: 0.8 }}
            >
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-400">
                <CheckCircle2Icon className="size-3" />
                Data received
              </span>
            </motion.div>
          ) : null}
        </div>

        <div className="relative flex flex-col items-center gap-1">
          <div
            className={cn(
              "flex size-9 items-center justify-center rounded-xl border",
              phase === "fetching"
                ? "border-primary/30 bg-primary/10"
                : "border-border/50 bg-muted/50"
            )}
          >
            {phase === "fetching" ? (
              <>
                <ServerIcon className="relative z-10 size-4 text-primary" />
                <span className="orbit-dot absolute size-1.5 rounded-full bg-primary" />
              </>
            ) : (
              <DatabaseIcon className="size-4 text-muted-foreground" />
            )}
          </div>
          <span className="text-[9px] text-muted-foreground">Service</span>
        </div>
      </div>

      <p className="mt-2.5 text-center text-[11px] text-muted-foreground">
        {phase === "preparing" && "Packaging what you asked for…"}
        {phase === "sending" && "Sending your details securely…"}
        {phase === "fetching" && "Waiting for the service to respond…"}
        {phase === "complete" && "Response arrived successfully"}
        {phase === "error" && "Could not reach the service"}
      </p>
    </div>
  );
}

/** Gradually reveals short values; shows full text for long ones. */
function AnimatedValue({ value, isLong }: { value: string; isLong: boolean }) {
  const [displayed, setDisplayed] = useState(isLong ? value : "");

  useEffect(() => {
    if (isLong) {
      setDisplayed(value);
      return;
    }

    setDisplayed("");
    let index = 0;
    const interval = window.setInterval(() => {
      index += 1;
      setDisplayed(value.slice(0, index));
      if (index >= value.length) {
        window.clearInterval(interval);
      }
    }, 18);

    return () => window.clearInterval(interval);
  }, [isLong, value]);

  return (
    <span className="font-medium text-foreground">
      {displayed}
      {!isLong && displayed.length < value.length ? (
        <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-primary" />
      ) : null}
    </span>
  );
}

/** Parameter chips that slide in one after another. */
function AnimatedParamGrid({ params }: { params: FormattedParam[] }) {
  if (params.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border/50 bg-muted/20 px-3 py-2.5 text-center text-muted-foreground text-xs">
        No extra details needed — just connecting to the service
      </p>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {params.map((param, index) => (
        <motion.div
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="param-enter overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.06] to-transparent p-3"
          initial={{ opacity: 0, y: 8, scale: 0.97 }}
          key={param.key}
          style={{ animationDelay: `${index * 0.1}s` }}
          transition={{ delay: index * 0.08, duration: 0.4 }}
        >
          <div className="mb-1.5 flex items-center gap-1.5">
            <ArrowRightIcon className="size-3 text-primary/70" />
            <p className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
              {param.label}
            </p>
          </div>
          <p className="text-[13px] leading-relaxed">
            <AnimatedValue isLong={param.isLong} value={param.value} />
          </p>
        </motion.div>
      ))}
    </div>
  );
}

/** Live fetching scene with scan line and pulsing bars. */
function FetchingScene() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-primary/[0.03] p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
          style={{ animation: "scan-sweep 2s ease-in-out infinite" }}
        />
      </div>

      <div className="relative space-y-3">
        <div className="flex items-center gap-2">
          <span className="relative flex size-5 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-primary/25" />
            <SparklesIcon className="relative size-3.5 text-primary" />
          </span>
          <Shimmer className="font-medium text-[13px]" duration={1.1}>
            Gathering information from the server
          </Shimmer>
        </div>

        <div className="space-y-2">
          {[100, 78, 56].map((width, i) => (
            <motion.div
              animate={{ opacity: [0.4, 0.9, 0.4] }}
              className="h-2 rounded-full bg-primary/15"
              key={width}
              style={{ width: `${width}%` }}
              transition={{
                duration: 1.4,
                repeat: Number.POSITIVE_INFINITY,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Success panel with staggered item reveal. */
function ResultPanel({ output }: { output: FormattedToolOutput }) {
  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="result-reveal space-y-2"
      initial={{ opacity: 0, y: 8 }}
    >
      <div className="flex items-center gap-2">
        <CheckCircle2Icon className="size-4 text-emerald-600 sparkle-pop" />
        <h4 className="font-medium text-foreground text-sm">Here&apos;s what came back</h4>
      </div>

      <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent p-3.5">
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed">
          {output.summary}
        </p>

        {output.items.length > 0 ? (
          <div className="mt-3 grid gap-2 border-t border-emerald-500/15 pt-3">
            {output.items.map((item, index) => (
              <motion.div
                animate={{ opacity: 1, x: 0 }}
                initial={{ opacity: 0, x: -6 }}
                key={item.label}
                transition={{ delay: 0.15 + index * 0.08 }}
              >
                <p className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                  {item.label}
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-[12px] leading-relaxed">
                  {item.value.length > 220
                    ? `${item.value.slice(0, 220)}…`
                    : item.value}
                </p>
              </motion.div>
            ))}
          </div>
        ) : null}
      </div>
    </motion.section>
  );
}

/**
 * Rich animated card for tool calls — journey stepper, data-flow lane,
 * typing params, and result reveal. Used by MCP and built-in tools.
 */
export function ToolJourneyCard({
  title,
  subtitle,
  badge = "Tool",
  state,
  params,
  formattedOutput,
  errorText,
  input,
  output,
  icon = "builtin",
  reasoningSummary,
  modelReasoningSnippet,
  isReasoningLoading = false,
}: ToolJourneyCardProps) {
  const [showTechnical, setShowTechnical] = useState(false);
  const phase = useAnimatedPhase(state);
  const isRunning = isToolRunning(state);
  const isComplete = state === "output-available";
  const isError = state === "output-error" || state === "output-denied";

  const friendlyStatus = TOOL_JOURNEY_STEPS.find(
    (s) => s.id === (phase === "error" ? "fetching" : phase)
  )?.friendly;

  return (
    <Collapsible
      className={cn(
        "not-prose w-full overflow-hidden rounded-2xl border bg-card/80 shadow-[var(--shadow-card)] backdrop-blur-sm transition-all duration-500",
        isRunning && "composer-glow border-primary/35",
        isComplete && "border-emerald-500/25",
        isError && "border-destructive/35"
      )}
      defaultOpen
    >
      <CollapsibleTrigger className="group flex w-full flex-col gap-3 p-4 text-left transition-colors hover:bg-muted/20">
        <div className="flex w-full items-start gap-3">
          <div
            className={cn(
              "relative flex size-10 shrink-0 items-center justify-center rounded-xl border",
              isRunning && "border-primary/30 bg-primary/10",
              isComplete && "border-emerald-500/30 bg-emerald-500/10",
              isError && "border-destructive/30 bg-destructive/10",
              !isRunning && !isComplete && !isError && "border-border/50 bg-muted/40"
            )}
          >
            {isComplete ? (
              <CheckCircle2Icon className="size-5 text-emerald-600 sparkle-pop" />
            ) : isError ? (
              <XCircleIcon className="size-5 text-destructive" />
            ) : icon === "mcp" ? (
              <>
                <ServerIcon className="relative z-10 size-4 text-primary" />
                {isRunning ? (
                  <span className="orbit-dot absolute size-1.5 rounded-full bg-primary" />
                ) : null}
              </>
            ) : (
              <SparklesIcon
                className={cn(
                  "size-4",
                  isRunning ? "animate-pulse text-primary" : "text-muted-foreground"
                )}
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-sm tracking-tight">{title}</p>
              <span className="rounded-full border border-border/50 bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground">
                {badge}
              </span>
            </div>
            <p className="mt-0.5 text-[13px] text-muted-foreground leading-snug">
              {isRunning ? (
                <Shimmer duration={1.2}>{friendlyStatus ?? subtitle}</Shimmer>
              ) : (
                subtitle
              )}
            </p>
          </div>

          <ChevronDownIcon className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </div>

        {!isError ? (
          <div className="w-full px-1">
            <JourneyStepper
              isComplete={isComplete}
              isError={isError}
              phase={phase}
            />
          </div>
        ) : null}
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-4 border-t border-border/40 px-4 pb-4 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
        {reasoningSummary || isReasoningLoading ? (
          <ToolReasoningBanner
            isLoading={isReasoningLoading}
            modelSnippet={modelReasoningSnippet}
            summary={reasoningSummary ?? ""}
          />
        ) : null}

        <AnimatePresence mode="wait">
          {!isError ? (
            <motion.div
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key="flow"
            >
              <DataFlowLane phase={phase} />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <section className="space-y-2.5">
          <h4 className="flex items-center gap-1.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wider">
            <ArrowRightIcon className="size-3" />
            Details being used
          </h4>
          <AnimatedParamGrid params={params} />
        </section>

        <AnimatePresence mode="wait">
          {isRunning ? (
            <motion.div
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              initial={{ opacity: 0, height: 0 }}
              key="fetching"
            >
              <FetchingScene />
            </motion.div>
          ) : null}
        </AnimatePresence>

        {isError && errorText ? (
          <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-3.5">
            <p className="font-medium text-destructive text-sm">Something went wrong</p>
            <p className="mt-1 text-[13px] leading-relaxed">{errorText}</p>
          </div>
        ) : null}

        {formattedOutput ? <ResultPanel output={formattedOutput} /> : null}

        {(input !== undefined || output !== undefined || errorText) && (
          <section className="border-t border-border/30 pt-3">
            <button
              className="flex items-center gap-1.5 text-muted-foreground text-xs transition-colors hover:text-foreground"
              onClick={() => setShowTechnical((v) => !v)}
              type="button"
            >
              <CodeIcon className="size-3" />
              {showTechnical ? "Hide raw data" : "View raw data"}
            </button>
            <AnimatePresence>
              {showTechnical ? (
                <motion.pre
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-2 overflow-x-auto rounded-lg bg-muted/50 p-3 font-mono text-[10px] leading-relaxed"
                  exit={{ opacity: 0, height: 0 }}
                  initial={{ opacity: 0, height: 0 }}
                >
                  {JSON.stringify({ input, output, errorText }, null, 2)}
                </motion.pre>
              ) : null}
            </AnimatePresence>
          </section>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
