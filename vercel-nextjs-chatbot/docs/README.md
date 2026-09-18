# Documentation index

## Architecture

| Document | Description |
|----------|-------------|
| [browserbase-integration.md](./architecture/browserbase-integration.md) | End-to-end Browserbase integration overview |
| [unified-document-access.md](./architecture/unified-document-access.md) | Document fetch + text extraction (uploads + e-Builder links) |
| [agent-skills.md](./features/agent-skills.md) | Custom @mention skills in settings and chat |

## Features

| Document | Description |
|----------|-------------|
| [unified-document-access.md](./features/unified-document-access.md) | How agents read uploaded and e-Builder document contents |

## Images

| File | Description |
|------|-------------|
| [unified-document-access-architecture.svg](./images/unified-document-access-architecture.svg) | Architecture diagram |
| [unified-document-access-workflow.svg](./images/unified-document-access-workflow.svg) | User workflow diagram |

## Invoice Review Advisor (repo root)

Full architecture, ADRs, and screenshots: [`../../docs/README.md`](../../docs/README.md)

## Decisions (ADRs)

| ID | Title |
|----|-------|
| [001](./decisions/001-dynamic-stagehand-loading.md) | Dynamic Stagehand loading |
| [002](./decisions/002-ai-sdk-dependency-isolation.md) | AI SDK dependency isolation (ai@5 vs ai@6) |
| [003](./decisions/003-live-browser-panel.md) | Live browser panel on the right |
| [004](./decisions/004-browser-tool-tiering.md) | Search/Fetch vs live-browser tool tiers |
| [005](./decisions/005-session-lifecycle.md) | Per-chat session store and cleanup |
| [006](./decisions/006-browser-session-file-uploads.md) | Chat file → Browserbase session uploads |
