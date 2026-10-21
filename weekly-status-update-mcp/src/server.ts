import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SERVER_NAME, SERVER_VERSION, type AppConfig } from "./config.js";
import { EBuilderClient } from "./client.js";
import { registerWeeklyUpdateTools } from "./tools.js";

export function createWeeklyStatusServer(config: AppConfig): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION }, { instructions: `You are the weekly-status voice workflow assistant for e-Builder. Keep spoken responses concise and ask one field question at a time.

Always resolve the project first. For a spoken or slightly misspelled project reference (for example, "Kanija Taneja testing"), call find_weekly_update_project once. It makes bounded e-Builder LIKE searches and locally ranks possible spelling matches. Read the returned names and ask the caller to select one; never silently select a fuzzy match. Then list the BWPUP instance for the intended Friday, and fetch its form before asking for information. The Import SubmittedDate is an import timestamp, not the weekly report date: use Bi-Weekly Comment Date and the date in the subject. Never infer values from a previous period.

For a write: collect only the current-period fields, summarize every value, call prepare_weekly_update_submission, read its exact confirmation phrase aloud, and require the caller to say it verbatim. Then retrieve the Import schema and only submit a payload that matches it. If writes are disabled or schema verification has not happened on a scratch project, explain that you prepared the update for human submission instead. Never claim a workflow step advanced until you re-read the instance.` });
  registerWeeklyUpdateTools(server, new EBuilderClient(config), config);
  registerWeeklyStatusPrompts(server);
  return server;
}

function registerWeeklyStatusPrompts(server: McpServer): void {
  server.registerPrompt("weekly_update_voice_workflow", {
    title: "Weekly update voice workflow",
    description: "Instructions for safely handling one BWPUP weekly update conversation.",
  }, async () => ({
    messages: [{ role: "user", content: { type: "text", text: `Act as the e-Builder Weekly Status Assistant. Resolve the project first, then list the BWPUP instances and read the selected form before collecting any update. Ask one current-period question at a time. Before writing, summarize every value and require the exact confirmation phrase from prepare_weekly_update_submission. Do not write if the project is ambiguous, the instance is not selected, the process is at Finish, or e-Builder reports an error.` } }],
  }));
  server.registerPrompt("resolve_spoken_project", {
    title: "Resolve a spoken project name",
    description: "Use when a caller gives a project name, partial name, project number, or minor misspelling.",
    argsSchema: { projectReference: z.string().min(2).describe("The words spoken by the caller.") },
  }, async ({ projectReference }) => ({
    messages: [{ role: "user", content: { type: "text", text: `The caller said the project is "${projectReference}". Call find_weekly_update_project with those exact words. The tool will try bounded LIKE-search variants and rank candidates. Read the returned project names, IDs, and status briefly, then ask the caller to choose. Do not select a candidate solely because its score is high.` } }],
  }));
}
