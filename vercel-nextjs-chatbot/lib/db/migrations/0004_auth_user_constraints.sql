-- Widen email/password columns and enforce unique emails for login accounts.
ALTER TABLE "User" ALTER COLUMN "email" SET DATA TYPE varchar(255);
ALTER TABLE "User" ALTER COLUMN "password" SET DATA TYPE varchar(255);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_unique" ON "User" ("email");
