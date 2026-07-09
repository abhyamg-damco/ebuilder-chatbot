-- Per-user secret vault (plaintext for now; encrypt later).
CREATE TABLE IF NOT EXISTS "UserSecret" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userId" uuid NOT NULL REFERENCES "User"("id"),
  "name" varchar(128) NOT NULL,
  "slug" varchar(64) NOT NULL,
  "kind" varchar(32) DEFAULT 'other' NOT NULL,
  "value" text NOT NULL,
  "description" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserSecret_userId_slug_unique" ON "UserSecret" ("userId", "slug");
CREATE INDEX IF NOT EXISTS "UserSecret_userId_idx" ON "UserSecret" ("userId");

-- Chat session mode: general e-Builder vs Trimble automation.
ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "sessionType" varchar(32);
