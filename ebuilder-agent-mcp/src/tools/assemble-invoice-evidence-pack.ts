import { z } from "zod";
import type { EBuilderClient } from "../api/client.js";
import { toToolError, toToolResult } from "../api/client.js";
import { assembleInvoiceEvidencePack } from "../services/evidence-pack.js";
import { TOOL_GUIDES } from "../prompts/domain-guides.js";
import type { ToolRegistrar } from "./types.js";

export function registerAssembleInvoiceEvidencePackTool(
  server: ToolRegistrar,
  client: EBuilderClient
): void {
  server.registerTool(
    "assemble_invoice_evidence_pack",
    {
      description: TOOL_GUIDES.assemble_invoice_evidence_pack,
      inputSchema: {
        commitmentInvoiceId: z
          .string()
          .optional()
          .describe("Direct e-Builder CommitmentInvoiceId UUID"),
        invoiceNumber: z
          .string()
          .optional()
          .describe("Invoice number as user stated (e.g. 006, #6)"),
        commitmentNumber: z
          .string()
          .optional()
          .describe("Commitment/contract number filter"),
        commitmentId: z
          .string()
          .optional()
          .describe("CommitmentId UUID when known"),
        projectSearchTerm: z
          .string()
          .optional()
          .describe("Project name/code to scope invoice lookup"),
      },
    },
    async (args) => {
      try {
        const result = await assembleInvoiceEvidencePack(client, {
          commitmentInvoiceId: args.commitmentInvoiceId as string | undefined,
          invoiceNumber: args.invoiceNumber as string | undefined,
          commitmentNumber: args.commitmentNumber as string | undefined,
          commitmentId: args.commitmentId as string | undefined,
          projectSearchTerm: args.projectSearchTerm as string | undefined,
        });

        return toToolResult({
          status: result.status,
          pack: result.pack,
          stepsCompleted: result.stepsCompleted,
          nextSteps: result.nextSteps,
          agentDirective: result.agentDirective,
        });
      } catch (error) {
        return toToolError(
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  );
}
