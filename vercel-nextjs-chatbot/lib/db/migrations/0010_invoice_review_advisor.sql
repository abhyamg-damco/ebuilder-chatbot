ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "invoiceReviewConfig" jsonb;

CREATE TABLE IF NOT EXISTS "Persona" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userId" uuid NOT NULL REFERENCES "User"("id"),
  "name" varchar(128) NOT NULL,
  "slug" varchar(64) NOT NULL,
  "description" text,
  "instructions" text NOT NULL,
  "defaultTolerances" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "defaultEnabledChecks" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "enabled" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "Persona_userId_slug_unique" ON "Persona" ("userId", "slug");
CREATE INDEX IF NOT EXISTS "Persona_userId_idx" ON "Persona" ("userId");
