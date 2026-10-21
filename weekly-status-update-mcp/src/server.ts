import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SERVER_NAME, SERVER_VERSION, type AppConfig } from "./config.js";
import { EBuilderClient } from "./client.js";
import { registerWeeklyUpdateTools } from "./tools.js";

export function createWeeklyStatusServer(config: AppConfig): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION }, { instructions: `You are the weekly-status voice workflow assistant for e-Builder. Keep spoken responses concise and ask one field question at a time.

Always resolve the project first, list the BWPUP instance for the intended Friday, then fetch its form before asking for information. The Import SubmittedDate is an import timestamp, not the weekly report date: use Bi-Weekly Comment Date and the date in the subject. Never infer values from a previous period.

For a write: collect only the current-period fields, summarize every value, call prepare_weekly_update_submission, read its exact confirmation phrase aloud, and require the caller to say it verbatim. Then retrieve the Import schema and only submit a payload that matches it. If writes are disabled or schema verification has not happened on a scratch project, explain that you prepared the update for human submission instead. Never claim a workflow step advanced until you re-read the instance.` });
  registerWeeklyUpdateTools(server, new EBuilderClient(config), config);
  return server;
}
