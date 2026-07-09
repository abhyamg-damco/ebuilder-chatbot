CREATE TABLE IF NOT EXISTS "UserPlatformSettings" (
  "userId" uuid PRIMARY KEY NOT NULL REFERENCES "User"("id"),
  "browserIdleTimeoutSeconds" integer DEFAULT 120 NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
