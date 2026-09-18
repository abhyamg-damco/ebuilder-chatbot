import "server-only";

import type { ToolSet } from "ai";
import { closeMcpClients, loadMcpToolsForUser } from "@/lib/mcp/load-tools";
import { getGcsBucketName } from "@/lib/storage/config";
import { uploadToGcs } from "@/lib/storage/upload";
import { generateUUID } from "@/lib/utils";
import {
  appendMayoAuditEvent,
  completeMayoDocumentUpload,
  createMayoDocumentRecord,
  getMayoCaseById,
  getMayoIntegrationSyncById,
  updateMayoIntegrationSync,
} from "./db";
import { indexMayoDocumentJob } from "./openai";
import { buildMayoObjectPath } from "./storage";

function getToolOutputJson(output: unknown): unknown {
  if (!output || typeof output !== "object") {
    return output;
  }

  const content = (output as { content?: unknown }).content;
  if (!Array.isArray(content)) {
    return output;
  }

  const text = content
    .filter((item): item is { type: "text"; text: string } =>
      Boolean(
        item &&
          typeof item === "object" &&
          (item as { type?: unknown }).type === "text" &&
          typeof (item as { text?: unknown }).text === "string"
      )
    )
    .map((item) => item.text)
    .join("\n");

  if (!text) {
    return output;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { text };
  }
}

function executeMcpTool(
  tool: ToolSet[string],
  input: Record<string, unknown>
): Promise<unknown> {
  if (!tool.execute) {
    throw new Error("Configured eBuilder MCP tool is not executable");
  }

  return tool.execute(input, {
    toolCallId: generateUUID(),
    messages: [],
  });
}

export async function runMayoEbuilderSyncJob(input: {
  syncId: string;
  userId: string;
  userType: "guest" | "regular";
}): Promise<void> {
  const syncRecord = await getMayoIntegrationSyncById(input.syncId);
  if (!syncRecord) {
    return;
  }
  const caseRecord = await getMayoCaseById(syncRecord.caseId);
  if (!caseRecord) {
    return;
  }

  await updateMayoIntegrationSync({
    syncId: syncRecord.id,
    status: "running",
  });
  await appendMayoAuditEvent({
    caseId: syncRecord.caseId,
    actorUserId: input.userId,
    eventType: "ebuilder_sync.started",
    entityType: "integration_sync",
    entityId: syncRecord.id,
  });

  const bundle = await loadMcpToolsForUser(input.userId, input.userType);

  try {
    const entry = Object.entries(bundle.tools).find(([name]) =>
      name.endsWith("_assemble_invoice_evidence_pack")
    );
    if (!entry) {
      throw new Error(
        "No enabled MCP server exposes assemble_invoice_evidence_pack"
      );
    }

    const rawOutput = await executeMcpTool(entry[1], syncRecord.request);
    const result = getToolOutputJson(rawOutput);
    const json = JSON.stringify(
      {
        syncedAt: new Date().toISOString(),
        caseId: syncRecord.caseId,
        source: "eBuilder MCP",
        result,
      },
      null,
      2
    );
    const documentId = generateUUID();
    const filename = `ebuilder-evidence-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`;
    const objectPath = buildMayoObjectPath({
      caseId: syncRecord.caseId,
      documentId,
      filename,
    });
    const buffer = Buffer.from(json, "utf8");
    const bucket = getGcsBucketName();

    await createMayoDocumentRecord({
      id: documentId,
      caseId: syncRecord.caseId,
      userId: input.userId,
      category: "ebuilder_export",
      stage: "supporting",
      revision: 1,
      filename,
      mimeType: "application/json",
      sizeBytes: buffer.byteLength,
      bucket,
      objectPath,
    });
    const uploaded = await uploadToGcs({
      buffer,
      objectPath,
      mimeType: "application/json",
      isPublic: false,
    });
    await completeMayoDocumentUpload({
      documentId,
      checksumSha256: uploaded.checksumSha256,
      sizeBytes: buffer.byteLength,
    });
    await indexMayoDocumentJob(documentId);

    await updateMayoIntegrationSync({
      syncId: syncRecord.id,
      status: "completed",
      result: {
        evidencePack: result,
        documentId,
      },
    });
    await appendMayoAuditEvent({
      caseId: syncRecord.caseId,
      actorUserId: input.userId,
      eventType: "ebuilder_sync.completed",
      entityType: "integration_sync",
      entityId: syncRecord.id,
      metadata: { documentId },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateMayoIntegrationSync({
      syncId: syncRecord.id,
      status: "failed",
      errorMessage: message,
    });
    await appendMayoAuditEvent({
      caseId: syncRecord.caseId,
      actorUserId: input.userId,
      eventType: "ebuilder_sync.failed",
      entityType: "integration_sync",
      entityId: syncRecord.id,
      metadata: { error: message },
    });
  } finally {
    await closeMcpClients(bundle.clients);
  }
}
