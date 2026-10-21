# e-Builder Weekly Status MCP

A small **Streamable HTTP MCP server** for a Vapi assistant that prepares and, after explicit confirmation, submits e-Builder BWPUP weekly status updates.

It was built from the supplied process map, Loom, and UI screenshot. The workflow is intentionally narrow: it exposes six voice-call tools instead of a general e-Builder API.

## What this encodes

- BWPUP is a `NonCostProcesses` workflow and its project process prefix is configurable (default: `BWPUP`).
- Resolve a project, select the instance for the intended weekly date, then read that instance's form before speaking with the caller.
- The weekly report date is **`Bi-Weekly Comment Date`**, not `SubmittedDate`; import makes `SubmittedDate` misleading.
- The existing demo pattern is four projects: three with 23 instances and one with 24. The Loom describes an instance every Friday and using the intended/previous report date when import only shows the date.
- It filters the two raw-HTML artefact fields (`"` and `""`) from the voice form.

## Tools exposed to Vapi

| Tool | Purpose | Writes? |
|---|---|---|
| `find_weekly_update_project` | Match a project from a spoken name | No |
| `list_weekly_updates` | List BWPUP instances for that project/date | No |
| `get_weekly_update_form` | Get workflow state, comments, and form values | No |
| `prepare_weekly_update_submission` | Validate/update summary and generate required confirmation | No |
| `get_weekly_import_schema` | Fetch the tenant's safe `Import` request schema | No |
| `submit_weekly_update` | Run `NonCostProcesses/Import` with the verified schema payload | Yes — gated |

`submit_weekly_update` is a real API endpoint, but it is **disabled by default**. It rejects requests until all of these are true:

1. `EBUILDER_WRITES_ENABLED=true`.
2. The project's exact GUID is in `EBUILDER_ALLOWED_WRITE_PROJECT_IDS`.
3. The caller repeats the exact project/date confirmation issued by `prepare_weekly_update_submission`.
4. The payload has been mapped from `get_weekly_import_schema`, rather than guessed.

The vendor API has no delete/dry-run endpoint. In addition, the supplied research did not verify whether `Import` advances a non-cost workflow step. Use a scratch project first; do not turn on writes in a demo/production project until that test is complete.

## Local setup

```bash
cd /Users/user/Desktop/Damco/playground/vercel-chatbot-repos-trial/chatbot/weekly-status-update-mcp
cp .env.example .env
npm install
npm run build
npm test
npm run start:http
```

Configure either `EBUILDER_ACCESS_TOKEN` **or** `EBUILDER_USERNAME` and `EBUILDER_PASSWORD` in `.env`. Never place e-Builder credentials or the MCP key in the Vapi system prompt.

Check it locally:

```bash
curl http://localhost:8080/health
# {"status":"ok","server":"ebuilder-weekly-status","writesEnabled":false}
```

For a remote deployment, publish the container and give Vapi a TLS URL such as `https://weekly-mcp.example.com/mcp`. Set a long `MCP_API_KEY`, restrict `MCP_ALLOWED_HOSTS` to the deployment hostname, and give the server an e-Builder service account with the smallest practical project role.

## GitHub Actions / Cloud Run deployment

Two workflows deploy only when this MCP folder, its respective workflow, or the shared dotenv parser changes:

| Branch | Workflow | Cloud Run service | Secret Manager secret |
|---|---|---|---|
| `dev` | `dev-deploy-weekly-status-mcp.yml` | `dev-ebuilder-weekly-status-mcp` | `DEV-EBUILDER-WEEKLY-STATUS-MCP` |
| `main` | `main-deploy-weekly-status-mcp.yml` | `prod-ebuilder-weekly-status-mcp` | `PROD-EBUILDER-WEEKLY-STATUS-MCP` |

Before the first run, add the following repository/environment configuration—never commit these values:

- GitHub secret `GCP_PROJECT_ID` and `GCP_SA_KEY` (matching the existing Cloud Run workflows).
- GitHub variable `GCP_REGION` and `EBUILDER_WEEKLY_STATUS_MCP_GCP_SERVICE_ACCOUNT_EMAIL`.
- The two Secret Manager secrets above as dotenv documents. Each must include `MCP_API_KEY` and either `EBUILDER_ACCESS_TOKEN` or both `EBUILDER_USERNAME` and `EBUILDER_PASSWORD`; start with `EBUILDER_WRITES_ENABLED=false`.
- Artifact Registry repositories/path permissions for `ebuilder/dev` and `ebuilder/prod`, plus Cloud Run deploy and Secret Manager access for the GitHub service account.

The workflows run the typecheck and tests, build and push a Docker image, deploy it, then check `/health`. They do not call e-Builder during deployment.

## Vapi configuration

Vapi's MCP integration connects to a Streamable HTTP endpoint and imports the server's complete tool list at call start. In the Vapi dashboard:

1. Create **Tools → MCP**.
2. Name it `eBuilder Weekly Status`.
3. Set **Server URL** to `https://YOUR_DOMAIN/mcp`.
4. Add header `Authorization: Bearer YOUR_MCP_API_KEY`.
5. Add the MCP tool to your assistant and publish it.

Equivalent assistant-model fragment:

```json
{
  "tools": [
    {
      "type": "mcp",
      "function": { "name": "eBuilderWeeklyStatus" },
      "server": {
        "url": "https://YOUR_DOMAIN/mcp",
        "headers": { "Authorization": "Bearer YOUR_MCP_API_KEY" }
      },
      "metadata": { "protocol": "shttp" }
    }
  ]
}
```

Vapi identifies individual calls with `X-Call-Id`; this server is stateless by design, so it does not rely on a sticky MCP session.

## Paste-this Vapi system prompt

```text
You are the e-Builder Weekly Status Assistant. You help a project manager review and prepare one weekly status update at a time. Be friendly, precise, and brief: ask one question at a time and never read a long field list unless asked.

Scope: help only with weekly/BWPUP project updates. Do not answer unrelated construction, contract, financial, or employee questions.

Workflow:
1. Start by asking for the project name or project number and the intended report date. Convert a spoken date to YYYY-MM-DD.
2. Call find_weekly_update_project. If there are multiple matches, say the names and ask the caller to choose. Do not guess a project.
3. Call list_weekly_updates with the chosen official project name and date. If no record is found, explain that the process instance needs to be created or selected in e-Builder; do not invent one.
4. Call get_weekly_update_form for the selected instance before asking any data questions. Use its existing values only as context; never silently copy a previous-period value into the new update.
5. Gather only the relevant current-period fields, one at a time: overall update/comments, construction percentage, completed activities, upcoming stakeholder meeting, delays and remediation, vendor instructions, schedule changes, risks, and mitigations. Confirm dates, numbers, names, and percentages back to the caller.
6. Before any submission, read a concise complete summary of all collected values. Call prepare_weekly_update_submission. Then read the tool's exact confirmationRequired sentence word for word. Do not submit unless the caller repeats it exactly and clearly.
7. Call get_weekly_import_schema before any submit. Only submit a payload mapped to the returned schema. Never guess Import data fields.
8. If submit_weekly_update says writes are disabled, a project is not allowed, confirmation did not match, or the schema is unavailable, say the update is prepared but not submitted and explain the next safe action. Do not retry a write.
9. After a successful submission, call get_weekly_update_form to verify what e-Builder shows. Do not claim the workflow advanced unless the reread verifies it.

Important rules:
- SubmittedDate is an import timestamp, not the report date. Use Bi-Weekly Comment Date and the date in the process subject.
- Never expose credentials, API keys, raw MCP headers, or other projects' data.
- Never submit on a vague “yes.” Only the exact confirmation sentence from the tool authorizes it.
- Never say a record was submitted, saved, or advanced until a tool reports success and the form has been reread.
```

## Verification plan before enabling writes

1. Nominate a scratch project/process that no customer uses.
2. Leave `EBUILDER_WRITES_ENABLED=false` while testing project lookup, instance lookup, and voice interviews.
3. Call `get_weekly_import_schema` to determine the precise `data[]` payload convention for BWPUP.
4. Make one explicitly authorised scratch submission; confirm whether it merely imports fields or advances the workflow. Record the resulting instance ID and state.
5. Add only that scratch GUID to `EBUILDER_ALLOWED_WRITE_PROJECT_IDS`, enable writes temporarily, and test the confirmation gate.
6. Do not add production project IDs until the result is approved by the e-Builder process owner.

## Architecture

```text
Vapi assistant
  └─ HTTPS Streamable MCP (/mcp, Bearer MCP_API_KEY)
       ├─ read tools ──> e-Builder Query + dataFields + Comments
       └─ gated write ─> e-Builder NonCostProcesses/Import
                         (enabled + allowlisted project + exact caller confirmation)
```

## Important known limitation

The e-Builder mapping proves the read endpoints. It maps—but intentionally does not execute—the write endpoint. No implementation can safely claim the final `Import` payload or non-cost workflow advancement behavior without a schema read and a nominated scratch-project test. This server makes that boundary explicit rather than fabricating an unsafe submission path.
