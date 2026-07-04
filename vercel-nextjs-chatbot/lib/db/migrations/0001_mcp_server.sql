CREATE TABLE IF NOT EXISTS "McpServer" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userId" uuid NOT NULL REFERENCES "User"("id"),
  "name" varchar(128) NOT NULL,
  "description" text,
  "transport" varchar NOT NULL,
  "url" text,
  "command" text,
  "args" json DEFAULT '[]'::json NOT NULL,
  "env" json DEFAULT '{}'::json NOT NULL,
  "headers" json DEFAULT '{}'::json NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "McpServer_userId_idx" ON "McpServer" ("userId");
