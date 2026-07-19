# eBuilder Construct Agent MCP

Domain-orchestration MCP server for **Trimble Unity Construct (e-Builder)** APIs. It exposes read-focused tools so an AI agent can discover schemas, resolve projects/vendors, query cost and process data, and answer construction questions without hardcoding tenant field names.

| | |
|---|---|
| Server name | `ebuilder-construct-agent` |
| Version | `1.0.0` |
| Node | `>= 20` |
| Package | `ebuilder-construct-agent-mcp` |

## What it does

- Authenticates to e-Builder (password grant or bearer token)
- Registers **13 MCP tools** for query/GET/process workflows and invoice review
- Injects **server instructions** + **question recipes** into the MCP `initialize` payload so the host agent keeps calling tools until the answer is complete
- Runs as **stdio** (local) or **Streamable HTTP** (Docker / remote)

## Active tools

| Tool | Purpose |
|------|---------|
| `discover_query_schema` | Schema for POST `/api/v2/{Resource}/Query` (`schema=true`) |
| `discover_get_schema` | Schema for GET-only resources (Submittals, Forecasts, CashFlows, etc.) |
| `query_records` | POST Query with `SelectedFields` + `Filters` + pagination |
| `get_records` | GET list (`dateModified`, `limit`, `offset`) |
| `get_record_detail` | GET by id + optional sub-resource (`items`, `changes`, `customfields`, `contacts`, `reviewers`) |
| `resolve_project` | Fuzzy project match by name/code/custom ID |
| `resolve_company` | Fuzzy vendor/company match (`Companies`) |
| `query_processes` | Workflow queries (invoice approvals, bids, CO processes) |
| `get_original_budget` | Orchestrated: project search → Budgets schema → budget query |
| `aggregate_records` | Local top-N / sum / count / group-by on prior results |
| `assemble_invoice_evidence_pack` | Invoice review evidence pack orchestrator |
| `evaluate_invoice_checks` | Deterministic invoice review checks |
| `search_documents` | Find invoice PDFs/images for file-preview artifacts |

### Query resources

`Budgets`, `BudgetChanges`, `Commitments`, `CommitmentChanges`, `CommitmentInvoices`, `GeneralInvoices`, `Companies`, `Projects`, `Documents`, `ProjectFundingSources`, `Forecasts`, `CashFlows`, plus process resources below.

### Process resources (`query_processes`)

`BudgetChangeProcesses`, `CommitmentChangeProcesses`, `CommitmentProcesses`, `CommitmentInvoiceProcesses`, `GeneralInvoiceProcesses`, `NonCostProcesses`.

### GET resources (subset)

Includes the above cost entities plus `SubmittalItems`, `SubmittalPackages`, `ForecastItems`, `ProcessInstances`, master commitment/invoice entities, funding adjustments.

### Aliases (agent-facing)

| User term | API resource |
|-----------|--------------|
| Vendor | `Companies` |
| Contract | `Commitments` |
| Change order | `CommitmentChanges` |

### Filter operations

`EQ`, `NE`, `LIKE`, `IN`, `GT`, `GTE`, `LT`, `LTE`

## Active prompts

Prompts live under `src/prompts/` and are wired at server create time.

### 1. Server instructions (`server-instructions.ts`)

Injected via MCP `instructions` on initialize. Key rules:

- Keep calling tools until the question is fully answered
- Honor `nextSteps`, `suggestedFilters`, `agentDirective`, `hint` in tool responses
- Workflow: discover schema → resolve entities → query → paginate → aggregate
- Prefer `get_original_budget` for original/total/presented budget questions

### 2. Tool guides (`domain-guides.ts`)

Per-tool description text registered on each MCP tool (when to call, example args).

### 3. Question recipes (`question-recipes.ts`)

NL pattern → recommended tool sequence (budgets, COs, invoices, retainage, approval queues, submittals, forecasts, etc.). Embedded into server instructions.

## Project layout

```
src/
  index.ts              # stdio entry
  http.ts               # Streamable HTTP entry (/mcp, /health)
  server.ts             # tool registration
  config.ts             # env validation
  api/                  # client, paths, project search
  auth/                 # token manager
  tools/                # MCP tools
  prompts/              # instructions, guides, recipes
  smoke-test.ts         # API connectivity check
```

## Configuration

Copy `.env.example` → `.env` and fill credentials:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `EBUILDER_BASE_URL` | No | Default `https://api2-us2.e-builder.net` |
| `EBUILDER_USERNAME` | Yes* | Password-grant username |
| `EBUILDER_PASSWORD` | Yes* | Password-grant password |
| `EBUILDER_ACCESS_TOKEN` | Yes* | Skip Authenticate; use bearer token |
| `PORT` | No | HTTP port (default `8080`) |
| `MCP_API_KEY` | No | If set, require `Authorization: Bearer <key>` on `/mcp` |
| `MCP_ALLOWED_HOSTS` | No | Comma-separated Host values for HTTP Host validation |

\* Set either username+password **or** `EBUILDER_ACCESS_TOKEN`.

## Run locally

### Prerequisites

- Node.js 20+
- Valid e-Builder credentials

### Install & build

```bash
cd ebuilder-agent-mcp
npm install
npm run build
```

### Stdio (local MCP / chatbot registration)

```bash
npm start
# → node build/index.js
```

Chatbot `/settings/mcp/new` example:

- **transport:** `stdio`
- **command:** `node`
- **args:** `["/absolute/path/to/ebuilder-agent-mcp/build/index.js"]`
- **env:** `EBUILDER_USERNAME`, `EBUILDER_PASSWORD`, `EBUILDER_BASE_URL`

### HTTP (local remote-style server)

```bash
npm run start:http
# → listens on http://0.0.0.0:8080/mcp
```

Endpoints:

| Path | Method | Description |
|------|--------|-------------|
| `/` | GET | Server info |
| `/health` | GET | Health check |
| `/mcp` | POST | Streamable MCP |

If `MCP_API_KEY` is set, send:

```http
Authorization: Bearer <MCP_API_KEY>
```

### Smoke test

```bash
npm run smoke-test
# or: EBUILDER_ACCESS_TOKEN=... npx tsx src/smoke-test.ts
```

Exercises Budgets schema, project resolve (`Tower`), and a sample budget query.

### Other scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript → `build/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm start` | Build + stdio |
| `npm run start:http` | Build + HTTP |

## Run with Docker

Dockerfile builds the app and runs the **HTTP** transport (`node build/http.js`) on port **8080**.

### Build

```bash
cd ebuilder-agent-mcp
docker build -t ebuilder-agent-mcp .
```

### Run

```bash
docker run --rm -p 8080:8080 \
  -e EBUILDER_BASE_URL=https://api2-us2.e-builder.net \
  -e EBUILDER_USERNAME=your_user \
  -e EBUILDER_PASSWORD=your_password \
  -e MCP_API_KEY=optional_shared_secret \
  -e MCP_ALLOWED_HOSTS=localhost,127.0.0.1 \
  ebuilder-agent-mcp
```

Or pass an env file (do not commit secrets):

```bash
docker run --rm -p 8080:8080 --env-file .env ebuilder-agent-mcp
```

Verify:

```bash
curl http://localhost:8080/health
# {"status":"ok","server":"ebuilder-construct-agent-mcp"}
```

Remote chatbot registration:

- **transport:** `http`
- **url:** `http://localhost:8080/mcp` (or your deployed host)
- **headers:** `{ "Authorization": "Bearer <MCP_API_KEY>" }` when keyed

## Typical agent flow

1. `discover_query_schema` / `discover_get_schema` for the resource
2. `resolve_project` or `resolve_company` (or `get_original_budget` for budget questions)
3. `query_records` / `get_records` / `query_processes`
4. Paginate via `pageNumber` / `meta.totalRecords`
5. `aggregate_records` for top-N, sums, counts

## Notes

- Nearly all tools are **reads**. Field names are tenant-specific — always discover schema first.
- A Postman collection is under `postman/` for Unity Construct API exploration.
- `.env` and `.env.production` are gitignored; use `.env.example` as the template.
