# Agent skills

Custom instruction sets you create in **Settings → Agent skills** and activate in chat with `@skill-slug`.

## Create a skill

1. Open the user menu → **Agent skills** (signed-in users only).
2. Click **Add skill** and fill in:
   - **Name** — display label
   - **Slug** — handle used in chat (e.g. `code-review` → `@code-review`)
   - **Description** — shown in @mention autocomplete
   - **Instructions** — markdown the agent follows when the skill is active

## Use in chat

Type `@` in the message box to open autocomplete, or type `@your-slug` directly.

Example:

```text
@code-review please review the upload handler for security issues
```

Skills are **mention-only**: they apply only when referenced in that message (up to 5 per message).

## How it works

1. Client sends the message text plus optional `referencedSkillIds`.
2. Server parses `@slug` tokens and loads matching enabled skills from the database.
3. Skill content is appended to the system prompt for that turn.
4. The agent uses existing tools (MCP, browser, artifacts, uploads) as directed by the skill.

## Limits

| Limit | Value |
|-------|-------|
| Content per skill | 16,384 characters |
| Skills per message | 5 |
| Guest users | Cannot create or use skills |

For executable tools, use **MCP servers** instead of skills.
