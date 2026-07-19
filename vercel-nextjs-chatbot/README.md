# eBuilder Chatbot

Next.js chat app based on the [Vercel AI Chatbot](https://github.com/vercel/ai-chatbot) template, extended for **Trimble Unity Construct (e-Builder)** workflows: MCP tools, agent skills, secrets vault, and Browserbase automation.

| | |
|---|---|
| Stack | Next.js 16, AI SDK 6, Auth.js, Drizzle + Postgres |
| Models | OpenAI (direct API key) |
| Package manager | `pnpm` |
| Node | `>= 20` |

## What it does

- **Ivy agent** (`general`) — conversational e-Builder assistance via MCP tools, artifacts, and uploads
- **Max agent** (`trimble_automation`) — Browserbase-powered site login, file upload, and import workflows
- **MCP servers** — connect stdio / HTTP / SSE servers (e.g. [`ebuilder-agent-mcp`](../ebuilder-agent-mcp)) and load their tools into the chat agent
- **Agent skills** — custom `@slug` instruction packs from Settings
- **Secrets vault** — per-user credentials (including Trimble site login) injectable into prompts and browser flows
- **Browserbase** — web search, page fetch, and live cloud Chrome with a right-hand live-view panel
- **Uploads** — images/documents to Google Cloud Storage; optional “Use in browser” sync into Browserbase sessions

## Features

- [Next.js](https://nextjs.org) App Router, React Server Components, Server Actions
- [AI SDK](https://ai-sdk.dev) streaming chat, tool calls, artifacts (text / code / sheet / image)
- [shadcn/ui](https://ui.shadcn.com) + Tailwind CSS
- [Auth.js](https://authjs.dev) credentials auth (admin-created users by default; optional public `/register`)
- Postgres (Drizzle) for chats, MCP configs, skills, secrets, uploads metadata
- Redis for resumable streams
- Docker image for Cloud Run / local containers

## Session types

| Type | Agent | Mode | Typical use |
|------|--------|------|-------------|
| `general` | Ivy | API | MCP queries, Q&A, artifacts |
| `trimble_automation` | Max | Browser | Login → project → upload → import |

New chat from the sidebar shows the session picker. Opening `/` defaults to Ivy (`general`).

## Settings (signed-in)

| Path | Purpose |
|------|---------|
| `/settings/mcp` | Add / edit / test MCP servers |
| `/settings/skills` | Create `@mention` skills |
| `/settings/secrets` | Store credentials (Trimble setup included) |
| `/settings/platform` | Browser idle timeout and related prefs |

### Register eBuilder MCP (stdio)

From sibling package `ebuilder-agent-mcp` (build first: `npm run build`):

- **transport:** `stdio`
- **command:** `node`
- **args:** `["/absolute/path/to/ebuilder-agent-mcp/build/index.js"]`
- **env:** `EBUILDER_USERNAME`, `EBUILDER_PASSWORD`, `EBUILDER_BASE_URL`

### Register eBuilder MCP (HTTP)

With the MCP HTTP server running (e.g. Docker on port 8080):

- **transport:** `http`
- **url:** `http://localhost:8080/mcp`
- **headers:** `{ "Authorization": "Bearer <MCP_API_KEY>" }` when the server requires a key

See [`../ebuilder-agent-mcp/README.md`](../ebuilder-agent-mcp/README.md) for MCP tools, env vars, and Docker.

## Model providers

Chat models are configured in `lib/ai/models.ts` and call **OpenAI** with `OPENAI_API_KEY`. Default chat model: `gpt-5.2-chat-latest`. Included: GPT-5.5, GPT-5.2 Chat, GPT-4o, GPT-4o Mini, GPT-4 Turbo, o3-mini.

## Configuration

Copy `.env.example` → `.env.local` (or `.env`) and fill values:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_SECRET` | Yes | Auth.js secret (`openssl rand -base64 32`) |
| `AUTH_TRUST_HOST` | Yes* | `true` behind Docker / reverse proxy |
| `AUTH_URL` | Docker* | Public URL matching host port (e.g. `http://localhost:3002`) |
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `POSTGRES_URL` | Yes | Postgres connection string |
| `REDIS_URL` | Yes | Redis URL (resumable streams) |
| `GCS_BUCKET_NAME` | Yes | GCS bucket for uploads |
| `GCS_PROJECT_ID` | Yes | GCP project id |
| `GOOGLE_APPLICATION_CREDENTIALS` | Local* | SA JSON path for GCS signed URLs |
| `BROWSERBASE_API_KEY` | No | Enables browser tools + live panel |
| `NEXT_PUBLIC_ALLOW_PUBLIC_REGISTRATION` | No | `true` to enable `/register` |
| `BLOB_READ_WRITE_TOKEN` | No | Legacy Vercel Blob only |

\* Required for the noted environment.

Create a user when public registration is off:

```bash
pnpm user:create
```

## Running locally

> Do not commit `.env` / `.env.local` — they contain secrets.

```bash
pnpm install
pnpm db:migrate
pnpm dev
```

App: [http://localhost:3000](http://localhost:3000)

### Useful scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Next.js turbo dev server |
| `pnpm build` | Migrate + production build |
| `pnpm db:migrate` | Apply Drizzle migrations |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm user:create` | Create a credentials user |
| `pnpm check` / `pnpm fix` | Ultracite (Biome) lint/format |
| `pnpm test` | Playwright e2e |

## Docker

Multi-stage image runs the Next.js standalone server on port **8080** (Cloud Run–friendly).

```bash
docker build -t ebuilder-chatbot .
docker run --rm -p 3002:8080 \
  -e AUTH_URL=http://localhost:3002 \
  -e AUTH_TRUST_HOST=true \
  --env-file .env.local \
  ebuilder-chatbot
```

Set `AUTH_URL` to the URL you open in the browser so Auth.js callbacks do not resolve to `0.0.0.0`.

## Project layout (high level)

```
app/(chat)/          # Chat UI, settings, API routes
app/(auth)/          # Sign-in / register / Auth.js
lib/ai/              # Models, prompts, tools
lib/mcp/             # MCP client load + namespacing
lib/skills/          # @mention skill resolution
lib/secrets/         # Vault + Trimble helpers
lib/browserbase/     # Search / fetch / Stagehand sessions
lib/storage/         # GCS uploads
lib/db/              # Schema, migrations, queries
docs/                # Architecture + ADRs
```

## Documentation

| Doc | Topic |
|-----|--------|
| [docs/README.md](./docs/README.md) | Index |
| [docs/architecture/browserbase-integration.md](./docs/architecture/browserbase-integration.md) | Browserbase end-to-end |
| [docs/features/agent-skills.md](./docs/features/agent-skills.md) | Skills UX and limits |
| [docs/decisions/](./docs/decisions/) | ADRs (Stagehand loading, tool tiers, session lifecycle, uploads) |

## Notes

- MCP tools are namespaced per server (`mcp_*`). The system prompt switches into multi-step agent mode when they are connected.
- Browser tools register only when `BROWSERBASE_API_KEY` is set.
- New uploads go to GCS; Vercel Blob token is only for old message URLs.
- Pair with [`ebuilder-agent-mcp`](../ebuilder-agent-mcp) for Unity Construct API tools.
