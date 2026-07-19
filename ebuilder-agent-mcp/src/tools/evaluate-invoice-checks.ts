import { z } from "zod";
import {
  buildTolerances,
  DEFAULT_ENABLED_CHECKS,
  DEFAULT_TOLERANCES,
  mergeEnabledChecks,
} from "../checks/defaults.js";
import { evaluateInvoiceChecks } from "../checks/evaluate.js";
import type { EvidencePack } from "../checks/types.js";
import { toToolError, toToolResult } from "../api/client.js";
import { TOOL_GUIDES } from "../prompts/domain-guides.js";
import type { ToolRegistrar } from "./types.js";

const tolerancesSchema = z.object({
  overBillPct: z.number().optional(),
  overBillMinUsd: z.number().optional(),
  mathMinUsd: z.number().optional(),
  retentionPctTol: z.number().optional(),
  frontLoadPct: z.number().optional(),
  largePeriodPct: z.number().optional(),
});

const enabledChecksSchema = z
  .object({
    OVER_BILLING: z.boolean().optional(),
    DUPLICATE: z.boolean().optional(),
    RETAINAGE: z.boolean().optional(),
    MATH: z.boolean().optional(),
    CO_UNAPPROVED: z.boolean().optional(),
    FRONT_LOADING: z.boolean().optional(),
    PROGRESS: z.boolean().optional(),
    RFI_SCOPE: z.boolean().optional(),
    LARGE_PERIOD: z.boolean().optional(),
  })
  .optional();

export function registerEvaluateInvoiceChecksTool(
  server: ToolRegistrar
): void {
  server.registerTool(
    "evaluate_invoice_checks",
    {
      description: TOOL_GUIDES.evaluate_invoice_checks,
      inputSchema: {
        pack: z
          .unknown()
          .describe(
            "Normalized EvidencePack from assemble_invoice_evidence_pack"
          ),
        tolerances: tolerancesSchema
          .optional()
          .describe(
            "Per-chat tolerance overrides (defaults seeded from CostControlTolerancePercent)"
          ),
        enabledChecks: enabledChecksSchema.describe(
          "Per-check enable toggles (default all enabled)"
        ),
      },
    },
    async (args) => {
      try {
        const pack = args.pack as EvidencePack;
        if (!pack?.invoice || !pack?.commitment) {
          return toToolError(
            "Invalid pack: expected normalized EvidencePack with invoice and commitment."
          );
        }

        const tolerances = buildTolerances(
          pack.commitment.costControlTolerancePercent,
          {
            ...DEFAULT_TOLERANCES,
            ...(args.tolerances as z.infer<typeof tolerancesSchema> | undefined),
          }
        );

        const enabledChecks = mergeEnabledChecks(
          args.enabledChecks as Partial<typeof DEFAULT_ENABLED_CHECKS> | undefined
        );

        const result = evaluateInvoiceChecks(pack, {
          tolerances,
          enabledChecks,
        });

        return toToolResult({
          status: "complete",
          result,
          configUsed: { tolerances, enabledChecks },
          agentDirective:
            "Use these flags to write the Advisory Brief artifact. Every flag must cite its sources. Human approves — do not write back to e-Builder.",
        });
      } catch (error) {
        return toToolError(
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  );
}
