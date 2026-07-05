-- Allow MCP servers without a user so guest visitors share one configuration.
ALTER TABLE "McpServer" ALTER COLUMN "userId" DROP NOT NULL;
