import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppConfig } from "./config.js";
import { EBuilderClient } from "./client.js";
import { cleanFormFields, confirmationSentence, isValidWeeklyDate, WEEKLY_UPDATE_FIELDS } from "./weekly-update.js";

type ApiResponse = { records?: unknown[]; details?: unknown[]; [key: string]: unknown };
const valueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const importPayloadSchema = z.object({
  options: z.record(z.unknown()).default({}),
  data: z.array(z.record(z.unknown())).min(1),
});

function text(data: unknown, isError = false) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }], ...(isError ? { isError: true as const } : {}) };
}
function apiError(error: unknown) { return text({ error: error instanceof Error ? error.message : String(error) }, true); }
function processQueryFilters(projectName: string, date?: string) {
  return [
    { Field: "Project/ProjectName", Operation: "LIKE", Value: `%${projectName}%` },
    ...(date ? [{ Field: "ProcessInstance/Subject", Operation: "LIKE", Value: `%${toUsDate(date)}%` }] : []),
  ];
}
function toUsDate(iso: string): string { const [year, month, day] = iso.split("-"); return `${month}/${day}/${year}`; }
function canWrite(config: AppConfig, projectId: string, confirmation: string, commentDate: string) {
  if (!config.writesEnabled) throw new Error("Writes are disabled. Set EBUILDER_WRITES_ENABLED=true only after a scratch-project verification.");
  if (!config.allowedWriteProjectIds.includes(projectId)) throw new Error("This project is not in EBUILDER_ALLOWED_WRITE_PROJECT_IDS.");
  if (confirmation.trim() !== confirmationSentence(projectId, commentDate)) throw new Error("Confirmation sentence did not exactly match the prepared submission.");
}

/** Register the deliberately small, voice-focused e-Builder weekly-update tool surface. */
export function registerWeeklyUpdateTools(server: McpServer, client: EBuilderClient, config: AppConfig): void {
  server.registerTool("find_weekly_update_project", {
    description: "Resolve a spoken project name/number before discussing or updating its weekly status. Read-only.",
    inputSchema: { projectReference: z.string().min(2).describe("Words heard from the caller; do not normalize away meaningful words.") },
  }, async ({ projectReference }) => {
    try {
      const data = await client.post<ApiResponse>("/api/v2/Projects/Query", {
        SelectedFields: ["Project/ProjectId", "Project/ProjectName", "Project/PortalId", "Project/Status"],
        Filters: [{ Field: "Project/ProjectName", Operation: "LIKE", Value: `%${projectReference}%` }],
      }, { schema: false, pageNumber: 0, pageSize: 20 });
      return text({ status: data.records?.length ? "found" : "not_found", records: data.records ?? [], nextStep: "Ask the caller to choose one project if more than one record is returned." });
    } catch (error) { return apiError(error); }
  });

  server.registerTool("list_weekly_updates", {
    description: "List BWPUP weekly update instances for one confirmed project. Optionally narrow to the intended update date. Read-only.",
    inputSchema: { projectName: z.string().min(2), commentDate: z.string().optional().describe("ISO date YYYY-MM-DD; use when the caller names a week.") },
  }, async ({ projectName, commentDate }) => {
    try {
      if (commentDate && !isValidWeeklyDate(commentDate)) throw new Error("commentDate must be YYYY-MM-DD.");
      const data = await client.post<ApiResponse>(`/api/v2/${config.processResource}/Query`, {
        SelectedFields: ["ProcessInstance/InstanceId", "ProcessInstance/InstanceCounter", "ProcessInstance/Subject", "ProcessInstance/Status", "ProcessInstance/CurrentStepName", "ProcessInstance/DateDue", "Project/ProjectName"],
        Filters: processQueryFilters(projectName, commentDate),
        AdvancedScript: "orderby:[ProcessInstance/Subject],[ProcessInstance/InstanceId]",
      }, { processPrefix: config.processPrefix, schema: false, pageNumber: 0, pageSize: 100 });
      return text({ processPrefix: config.processPrefix, records: data.records ?? [], nextStep: "Call get_weekly_update_form for the single instance selected with the caller." });
    } catch (error) { return apiError(error); }
  });

  server.registerTool("get_weekly_update_form", {
    description: "Fetch the selected weekly-update form, workflow state, and prior values. Read-only. Call before asking questions; do not fetch all instances during a call.",
    inputSchema: { instanceId: z.string().min(1) },
  }, async ({ instanceId }) => {
    try {
      const fields = await client.get<ApiResponse>(`/api/v2/ProcessInstances/${encodeURIComponent(instanceId)}/dataFields`, { limit: 500, schema: false });
      let comments: unknown = undefined;
      try { comments = await client.get(`/api/v2/ProcessInstances/${encodeURIComponent(instanceId)}/Comments`, { limit: 100 }); } catch { comments = "Unavailable for drafts or this API role."; }
      return text({ workflow: fields.records?.[0] ?? null, fields: cleanFormFields(fields.details), comments, requiredInterviewFields: WEEKLY_UPDATE_FIELDS });
    } catch (error) { return apiError(error); }
  });

  server.registerTool("prepare_weekly_update_submission", {
    description: "Validate and summarize a weekly update without changing e-Builder. Returns the exact phrase the caller must say before a later submit tool can write.",
    inputSchema: {
      projectId: z.string().min(1), instanceId: z.string().min(1), commentDate: z.string(),
      updates: z.record(valueSchema).describe("Only current-period BWPUP field names and values collected in the call."),
    },
  }, async ({ projectId, instanceId, commentDate, updates }) => {
    try {
      if (!isValidWeeklyDate(commentDate)) throw new Error("commentDate must be YYYY-MM-DD.");
      const unknownFields = Object.keys(updates).filter((field) => !(WEEKLY_UPDATE_FIELDS as readonly string[]).includes(field));
      if (unknownFields.length) throw new Error(`Unsupported weekly form field(s): ${unknownFields.join(", ")}`);
      if (updates["Bi-Weekly Comment Date"] && updates["Bi-Weekly Comment Date"] !== commentDate) throw new Error("Bi-Weekly Comment Date must equal commentDate.");
      return text({
        status: "prepared_no_write", projectId, instanceId, processPrefix: config.processPrefix, commentDate, updates,
        confirmationRequired: confirmationSentence(projectId, commentDate),
        nextSteps: ["Call get_weekly_import_schema to retrieve the tenant's exact Import payload shape.", "Read the full summary to the caller.", "Only after the caller repeats the confirmation sentence exactly, call submit_weekly_update."],
        warning: "Import is irreversible and has not been verified to advance a NonCost workflow step. This tool never writes.",
      });
    } catch (error) { return apiError(error); }
  });

  server.registerTool("get_weekly_import_schema", {
    description: "Safely retrieve the e-Builder Import request schema for the configured BWPUP process. This must be called before submit_weekly_update; it does not import data.",
    inputSchema: {},
  }, async () => {
    try {
      const data = await client.post<ApiResponse>(`/api/v2/${config.processResource}/Import`, {}, {
        processPrefix: config.processPrefix, schema: true, schemaType: "request",
      });
      return text({ status: "schema_only", processPrefix: config.processPrefix, schema: data, instruction: "Map the prepared values into this exact schema. Do not guess the data[] element shape." });
    } catch (error) { return apiError(error); }
  });

  server.registerTool("submit_weekly_update", {
    description: "Irreversibly submit a schema-validated weekly update through e-Builder Import. It is disabled by default and requires an approved project plus the caller's exact spoken confirmation.",
    inputSchema: {
      projectId: z.string().min(1), commentDate: z.string(), confirmation: z.string(),
      importPayload: importPayloadSchema.describe("Exact payload assembled from get_weekly_import_schema; never invent its data[] shape."),
    },
  }, async ({ projectId, commentDate, confirmation, importPayload }) => {
    try {
      if (!isValidWeeklyDate(commentDate)) throw new Error("commentDate must be YYYY-MM-DD.");
      canWrite(config, projectId, confirmation, commentDate);
      const result = await client.post(`/api/v2/${config.processResource}/Import`, importPayload, {
        processPrefix: config.processPrefix, schema: false, schemaType: "request",
      });
      return text({ status: "submitted", projectId, commentDate, result, nextStep: "Tell the caller that e-Builder accepted the import, then verify the resulting instance with get_weekly_update_form." });
    } catch (error) { return apiError(error); }
  });
}
