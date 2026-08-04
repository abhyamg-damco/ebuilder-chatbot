# Unified Document Access — feature guide

## What you can do

Ask the agent about **document contents** without re-uploading files:

| Source | Example |
|--------|---------|
| Chat attachment | “What line items are in the PDF I uploaded?” |
| e-Builder document | “What is in the Cathcart Construction invoice for ESRI 006A?” |

## Prerequisites

1. **e-Builder MCP** registered in chat settings ([screenshot](../images/add-ebuilder-mcp-server.png))
2. **e-Builder credentials** in both:
   - `ebuilder-agent-mcp/.env`
   - `vercel-nextjs-chatbot/.env`
3. Dev server restarted after env changes

## Typical flow

![Workflow](../images/unified-document-access-workflow.svg)

1. Ask to **show** or **find** a document (e.g. “Show invoice for ESRI 006A”).
2. MCP returns `fileId` / `downloadUrl`; UI may show **file-preview**.
3. Ask a **content** question (e.g. “What is in this invoice?”).
4. Agent answers from **Linked e-Builder documents** text in context or via **`getLinkedDocuments`**.

## What the agent uses

| Mechanism | Purpose |
|-----------|---------|
| **Chat uploads** section | Uploaded PDF/DOCX text (auto-injected) |
| **Linked e-Builder documents** section | Extracted text from MCP-resolved docs |
| **`getLinkedDocuments`** | Full 8k preview; refresh with `fileId` or `downloadUrl` |
| **`createDocument(file-preview)`** | Visual preview only — not for text Q&A |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| “No extractable text” but preview works | Ensure latest code (MCP envelope unwrap); restart `pnpm dev` |
| Fetch failed | Add `EBUILDER_*` to **chatbot** `.env`, not MCP only |
| Same-turn Q&A empty | Agent should call `getLinkedDocuments({ fileId })` after MCP |
| DOCX empty | Image-only/scanned Word needs OCR (out of scope v1) |

## Documentation map

| Document | Location |
|----------|----------|
| Architecture (chatbot) | [vercel-nextjs-chatbot/docs/architecture/unified-document-access.md](../../vercel-nextjs-chatbot/docs/architecture/unified-document-access.md) |
| MCP document tools | [ebuilder-agent-mcp/docs/unified-document-access.md](../../ebuilder-agent-mcp/docs/unified-document-access.md) |
| Architecture (repo) | [architecture/unified-document-access.md](../architecture/unified-document-access.md) |
