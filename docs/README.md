# Invoice Review Advisor — documentation

Documentation for the **Invoice Review Advisor** feature: an advisory-only invoice review copilot built on the Vercel chatbot and the e-Builder Agent MCP server.

## Product brief

| Resource | Description |
|----------|-------------|
| [ebuilder-invoice-advisor-onepager.pdf](./resources/ebuilder-invoice-advisor-onepager.pdf) | Original one-pager (scope, checks, demo flow) |

## Architecture

| Document | Description |
|----------|-------------|
| [invoice-review-advisor.md](./architecture/invoice-review-advisor.md) | End-to-end system design (chatbot, MCP, e-Builder, artifacts) |
| [unified-document-access.md](./architecture/unified-document-access.md) | Document fetch + text extraction for uploads and e-Builder links |

## Features

| Document | Description |
|----------|-------------|
| [invoice-review-advisor.md](./features/invoice-review-advisor.md) | How to run an invoice review session |
| [personas.md](./features/personas.md) | Review personas — create, edit, enable/disable |
| [unified-document-access.md](./features/unified-document-access.md) | Read e-Builder document contents in chat |
| [wapi-voice-assistant-prompt.md](./wapi-voice-assistant-prompt.md) | WAPI system prompt for voice-tolerant project resolution |

## Decisions (ADRs)

| ID | Title |
|----|-------|
| [001](./decisions/001-advisory-only-no-writeback.md) | Advisory-only — no write-back to e-Builder |
| [002](./decisions/002-persona-driven-review-config.md) | Persona-driven defaults + per-chat overrides |
| [003](./decisions/003-deterministic-checks-in-mcp.md) | Deterministic checks live in MCP, not the LLM |
| [004](./decisions/004-two-way-matching-default.md) | Two-way matching as the default scope |
| [005](./decisions/005-advisory-brief-artifact.md) | Structured output via `advisory-brief` artifact |

## Images

| File | Description |
|------|-------------|
| [review-personas-list.png](./images/review-personas-list.png) | Settings → Review Personas list |
| [persona-form-ui.png](./images/persona-form-ui.png) | Create / edit persona form |
| [invoice-review-architecture.png](./images/invoice-review-architecture.png) | High-level architecture |
| [invoice-review-workflow.png](./images/invoice-review-workflow.png) | Mandatory review workflow |
| [add-mcp-server.png](./images/add-mcp-server.png) | Adding the e-Builder MCP server in chat settings |
| [unified-document-access-architecture.svg](./images/unified-document-access-architecture.svg) | Unified document access — component flow |
| [unified-document-access-workflow.svg](./images/unified-document-access-workflow.svg) | e-Builder document Q&A user workflow |

## Related chatbot docs

Browser automation, agent skills, and other platform ADRs live under [`vercel-nextjs-chatbot/docs/`](../vercel-nextjs-chatbot/docs/README.md).
