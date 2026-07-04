-- Promote MCP servers created by guest sessions to the shared global scope.
UPDATE "McpServer"
SET "userId" = NULL
WHERE "userId" IN (
  SELECT "id" FROM "User" WHERE "email" ~ '^guest-[0-9]+$'
);
