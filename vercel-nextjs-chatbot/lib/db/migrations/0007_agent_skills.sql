CREATE TABLE IF NOT EXISTS "AgentSkill" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userId" uuid NOT NULL REFERENCES "User"("id"),
  "name" varchar(128) NOT NULL,
  "slug" varchar(64) NOT NULL,
  "description" text,
  "content" text NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "AgentSkill_userId_slug_unique" ON "AgentSkill" ("userId", "slug");
CREATE INDEX IF NOT EXISTS "AgentSkill_userId_idx" ON "AgentSkill" ("userId");
